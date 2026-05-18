from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


INWARD_STORAGE_TABLES = {
    "GRN": ("grn_inward_records", "grn_inward_items"),
    "PO": ("po_inward_records", "po_inward_items"),
    "LO": ("lo_inward_records", "lo_inward_items"),
    "JO": ("jo_inward_records", "jo_inward_items"),
}

INWARD_NUMBER_PREFIXES = {
    "GRN": "GRN",
    "PO": "POI",
    "LO": "LOI",
    "JO": "JOI",
}


class PurchaseInwardPayload(BaseModel):
    inwardType: Optional[str] = "GRN"
    inwardNo: str
    inwardDate: str
    supplierId: Optional[int] = None
    customerId: Optional[int] = None
    invoiceNo: Optional[str] = None
    vehicleNo: Optional[str] = None
    remarks: Optional[str] = None
    itemId: int
    qty: str
    rate: Optional[str] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _ensure_inward_type_column(cursor):
    cursor.execute(
        """
        ALTER TABLE purchase_inward
        ADD COLUMN IF NOT EXISTS inward_type VARCHAR(30) DEFAULT 'GRN'
        """
    )


def _ensure_type_wise_inward_tables(cursor):
    for header_table, item_table in INWARD_STORAGE_TABLES.values():
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {header_table} (
                id BIGSERIAL PRIMARY KEY,
                purchase_inward_id BIGINT NOT NULL UNIQUE
                    REFERENCES purchase_inward(id) ON DELETE CASCADE,
                inward_no VARCHAR(100) NOT NULL,
                inward_date DATE NOT NULL,
                inward_type VARCHAR(30) NOT NULL,
                supplier_id BIGINT,
                customer_id BIGINT,
                invoice_no VARCHAR(100),
                vehicle_no VARCHAR(100),
                remarks TEXT,
                status VARCHAR(50) DEFAULT 'Posted',
                total_qty NUMERIC(14,3) DEFAULT 0,
                total_amount NUMERIC(14,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {item_table} (
                id BIGSERIAL PRIMARY KEY,
                purchase_inward_item_id BIGINT NOT NULL UNIQUE
                    REFERENCES purchase_inward_items(id) ON DELETE CASCADE,
                purchase_inward_id BIGINT NOT NULL
                    REFERENCES purchase_inward(id) ON DELETE CASCADE,
                item_id BIGINT NOT NULL REFERENCES items(id),
                qty NUMERIC(14,3) DEFAULT 0,
                rate NUMERIC(14,2) DEFAULT 0,
                amount NUMERIC(14,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def _sync_type_wise_inward_storage(cursor, inward_type, purchase, data, line, qty, rate, amount):
    inward_type = (inward_type or "GRN").upper()
    header_table, item_table = INWARD_STORAGE_TABLES.get(
        inward_type,
        INWARD_STORAGE_TABLES["GRN"],
    )

    cursor.execute(
        f"""
        INSERT INTO {header_table} (
            purchase_inward_id, inward_no, inward_date, inward_type,
            supplier_id, customer_id, invoice_no, vehicle_no, remarks,
            status, total_qty, total_amount
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (purchase_inward_id) DO UPDATE SET
            inward_no = EXCLUDED.inward_no,
            inward_date = EXCLUDED.inward_date,
            inward_type = EXCLUDED.inward_type,
            supplier_id = EXCLUDED.supplier_id,
            customer_id = EXCLUDED.customer_id,
            invoice_no = EXCLUDED.invoice_no,
            vehicle_no = EXCLUDED.vehicle_no,
            remarks = EXCLUDED.remarks,
            status = EXCLUDED.status,
            total_qty = EXCLUDED.total_qty,
            total_amount = EXCLUDED.total_amount
        """,
        (
            purchase["id"],
            data["inwardNo"],
            data["inwardDate"],
            inward_type,
            data["supplierId"],
            data["customerId"],
            data["invoiceNo"],
            data["vehicleNo"],
            data["remarks"],
            purchase["status"],
            qty,
            amount,
        ),
    )

    cursor.execute(
        f"""
        INSERT INTO {item_table} (
            purchase_inward_item_id, purchase_inward_id, item_id, qty, rate, amount
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (purchase_inward_item_id) DO UPDATE SET
            purchase_inward_id = EXCLUDED.purchase_inward_id,
            item_id = EXCLUDED.item_id,
            qty = EXCLUDED.qty,
            rate = EXCLUDED.rate,
            amount = EXCLUDED.amount
        """,
        (line["id"], purchase["id"], data["itemId"], qty, rate, amount),
    )


@router.get("/next-number")
def get_next_purchase_inward_number(inward_type: Optional[str] = "GRN"):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    selected_type = (inward_type or "GRN").upper()
    prefix = INWARD_NUMBER_PREFIXES.get(selected_type, "PIN")

    try:
        _ensure_inward_type_column(cursor)
        cursor.execute(
            """
            SELECT inward_no
            FROM purchase_inward
            WHERE inward_type = %s
              AND inward_no LIKE %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (selected_type, f"{prefix}-%"),
        )
        row = cursor.fetchone()
        current = row["inward_no"] if row else ""
        try:
            next_number = int(str(current).split("-")[-1]) + 1
        except ValueError:
            next_number = 1
        return {"nextNumber": f"{prefix}-{next_number:04d}"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/invoice-nos")
def list_purchase_invoice_nos(
    inward_type: Optional[str] = None,
    supplier_id: Optional[int] = None,
    q: Optional[str] = None,
):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_inward_type_column(cursor)
        _ensure_type_wise_inward_tables(cursor)
        cursor.execute(
            """
            SELECT DISTINCT pi.invoice_no
            FROM purchase_inward pi
            WHERE pi.invoice_no IS NOT NULL
              AND pi.invoice_no <> ''
              AND (%s IS NULL OR pi.inward_type = %s)
              AND (%s IS NULL OR pi.supplier_id = %s)
              AND (%s IS NULL OR pi.invoice_no ILIKE %s)
            ORDER BY pi.invoice_no ASC
            LIMIT 15
            """,
            (
                inward_type,
                inward_type,
                supplier_id,
                supplier_id,
                q,
                f"%{q}%" if q else None,
            ),
        )
        return [row["invoice_no"] for row in cursor.fetchall()]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/")
def list_purchase_inwards(inward_type: Optional[str] = None):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_inward_type_column(cursor)
        _ensure_type_wise_inward_tables(cursor)
        cursor.execute(
            """
            SELECT
                pi.id,
                pi.inward_type,
                pi.inward_no,
                pi.inward_date,
                pi.invoice_no,
                pi.vehicle_no,
                pi.status,
                pi.created_at,
                s.id AS supplier_id,
                s.supplier_name,
                c.id AS customer_id,
                c.customer_name,
                i.id AS item_id,
                i.item_code,
                i.item_name,
                pii.qty,
                pii.rate,
                pii.amount
            FROM purchase_inward pi
            JOIN purchase_inward_items pii ON pii.inward_id = pi.id
            JOIN items i ON i.id = pii.item_id
            LEFT JOIN suppliers s ON s.id = pi.supplier_id
            LEFT JOIN customers c ON c.id = pi.customer_id
            WHERE (%s IS NULL OR pi.inward_type = %s)
            ORDER BY pi.id DESC, pii.id DESC
            """,
            (inward_type, inward_type),
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def create_purchase_inward(payload: PurchaseInwardPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    qty = Decimal(str(data["qty"]))
    rate = Decimal(str(data["rate"] or "0"))
    amount = qty * rate

    try:
        _ensure_inward_type_column(cursor)
        _ensure_type_wise_inward_tables(cursor)
        inward_type = (data["inwardType"] or "GRN").upper()

        if inward_type == "LO":
            if not data["customerId"]:
                raise HTTPException(status_code=400, detail="Customer is required for LO inward")
        else:
            if not data["supplierId"]:
                raise HTTPException(status_code=400, detail="Supplier is required")

        if data["supplierId"]:
            cursor.execute("SELECT id FROM suppliers WHERE id = %s", (data["supplierId"],))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Supplier not found")

        cursor.execute("SELECT id FROM items WHERE id = %s", (data["itemId"],))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Item not found")

        if data["customerId"]:
            cursor.execute("SELECT id FROM customers WHERE id = %s", (data["customerId"],))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Customer not found")

        cursor.execute(
            """
            INSERT INTO purchase_inward (
                inward_type, inward_no, inward_date, supplier_id, customer_id,
                invoice_no, vehicle_no, remarks, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Posted')
            RETURNING id, inward_type, inward_no, inward_date, status
            """,
            (
                inward_type,
                data["inwardNo"],
                data["inwardDate"],
                data["supplierId"],
                data["customerId"],
                data["invoiceNo"],
                data["vehicleNo"],
                data["remarks"],
            ),
        )
        purchase = cursor.fetchone()

        cursor.execute(
            """
            INSERT INTO purchase_inward_items (
                inward_id, item_id, qty, rate, amount
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (purchase["id"], data["itemId"], qty, rate, amount),
        )
        line = cursor.fetchone()

        cursor.execute(
            """
            SELECT balance_qty
            FROM stock_ledger
            WHERE item_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (data["itemId"],),
        )
        last_entry = cursor.fetchone()
        previous_balance = Decimal(str(last_entry["balance_qty"])) if last_entry else Decimal("0")
        new_balance = previous_balance + qty

        cursor.execute(
            """
            INSERT INTO stock_ledger (
                item_id, ref_type, ref_id, inward_qty, outward_qty, balance_qty, remarks
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["itemId"],
                f"PURCHASE_INWARD_{inward_type.replace(' ', '_')}",
                purchase["id"],
                qty,
                Decimal("0"),
                new_balance,
                data["remarks"] or f"Inward {data['inwardNo']}",
            ),
        )

        _sync_type_wise_inward_storage(
            cursor,
            inward_type,
            purchase,
            data,
            line,
            qty,
            rate,
            amount,
        )

        connection.commit()
        return {
            "message": "Purchase inward created successfully",
            "purchase": purchase,
            "line": {
                "id": line["id"],
                "item_id": data["itemId"],
                "qty": str(qty),
                "rate": str(rate),
                "amount": str(amount),
            },
            "stock": {
                "previous_balance": str(previous_balance),
                "new_balance": str(new_balance),
            },
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
