from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


RETURN_PREFIXES = {
    "PO_DC_RETURN": "GRN-PO-RT",
    "PO_INVOICE_RETURN": "DRN",
}


class PurchaseReturnItemPayload(BaseModel):
    itemId: int
    qty: str
    rate: Optional[str] = "0"
    rejectedQty: Optional[str] = "0"
    printCode: Optional[str] = None


class PurchaseReturnPayload(BaseModel):
    returnType: str = "PO_DC_RETURN"
    returnNo: str
    returnDate: str
    supplierId: Optional[int] = None
    purchaseInwardId: Optional[int] = None
    referenceNo: Optional[str] = None
    referenceDate: Optional[str] = None
    purchaseLedger: Optional[str] = None
    lrNo: Optional[str] = None
    soNumber: Optional[str] = None
    status: Optional[str] = "Posted"
    approvalStatus: Optional[str] = "Pending"
    remarks: Optional[str] = None
    taxPercent: Optional[str] = "0"
    items: List[PurchaseReturnItemPayload]


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _to_decimal(value):
    return Decimal(str(value or "0"))


def _ensure_purchase_return_tables(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS purchase_returns (
            id BIGSERIAL PRIMARY KEY,
            return_type VARCHAR(50) NOT NULL,
            return_no VARCHAR(100) NOT NULL UNIQUE,
            return_date DATE NOT NULL,
            supplier_id BIGINT REFERENCES suppliers(id),
            purchase_inward_id BIGINT REFERENCES purchase_inward(id),
            reference_no VARCHAR(100),
            reference_date DATE,
            purchase_ledger VARCHAR(150),
            lr_no VARCHAR(100),
            so_number VARCHAR(100),
            subtotal NUMERIC(14,2) DEFAULT 0,
            tax_percent NUMERIC(10,2) DEFAULT 0,
            tax_amount NUMERIC(14,2) DEFAULT 0,
            total_amount NUMERIC(14,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'Posted',
            approval_status VARCHAR(50) DEFAULT 'Pending',
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS purchase_return_items (
            id BIGSERIAL PRIMARY KEY,
            purchase_return_id BIGINT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
            item_id BIGINT NOT NULL REFERENCES items(id),
            qty NUMERIC(14,3) DEFAULT 0,
            rate NUMERIC(14,2) DEFAULT 0,
            amount NUMERIC(14,2) DEFAULT 0,
            net_amount NUMERIC(14,2) DEFAULT 0,
            rejected_qty NUMERIC(14,3) DEFAULT 0,
            print_code VARCHAR(200),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _latest_balance(cursor, item_id):
    cursor.execute(
        """
        SELECT balance_qty
        FROM stock_ledger
        WHERE item_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (item_id,),
    )
    row = cursor.fetchone()
    return _to_decimal(row["balance_qty"]) if row else Decimal("0")


def _apply_return_stock(cursor, item_id, ref_id, qty, remarks):
    qty = _to_decimal(qty)
    current_balance = _latest_balance(cursor, item_id)
    if current_balance < qty:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available stock is {current_balance}")

    new_balance = current_balance - qty
    cursor.execute(
        """
        INSERT INTO stock_ledger (
            item_id, ref_type, ref_id, inward_qty, outward_qty, balance_qty, remarks
        )
        VALUES (%s, %s, %s, 0, %s, %s, %s)
        """,
        (item_id, "PURCHASE_RETURN", ref_id, qty, new_balance, remarks),
    )


def _ensure_unique_return_no(cursor, return_no, exclude_id=None):
    cursor.execute(
        """
        SELECT id
        FROM purchase_returns
        WHERE return_no = %s
          AND (%s IS NULL OR id <> %s)
        LIMIT 1
        """,
        (return_no, exclude_id, exclude_id),
    )
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Return number already exists")


def _validate_refs(cursor, data):
    if data["supplierId"]:
        cursor.execute("SELECT id FROM suppliers WHERE id = %s", (data["supplierId"],))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Supplier not found")
    if data["purchaseInwardId"]:
        cursor.execute("SELECT id FROM purchase_inward WHERE id = %s", (data["purchaseInwardId"],))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Purchase inward not found")


def _save_items(cursor, purchase_return_id, items, return_no):
    saved = []
    subtotal = Decimal("0")
    for entry in items:
        item_id = int(entry["itemId"])
        qty = _to_decimal(entry["qty"])
        rate = _to_decimal(entry.rate)
        rejected_qty = _to_decimal(entry.rejectedQty)
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Return qty must be greater than 0")

        cursor.execute("SELECT id, item_code, item_name FROM items WHERE id = %s", (item_id,))
        item = cursor.fetchone()
        if item is None:
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found")

        amount = qty * rate
        subtotal += amount
        cursor.execute(
            """
            INSERT INTO purchase_return_items (
                purchase_return_id, item_id, qty, rate, amount, net_amount, rejected_qty, print_code
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (purchase_return_id, item_id, qty, rate, amount, amount, rejected_qty, entry.printCode or item["item_code"]),
        )
        line = cursor.fetchone()
        _apply_return_stock(cursor, item_id, purchase_return_id, qty, f"Purchase return {return_no}")
        saved.append({"id": line["id"], "item_id": item_id, "qty": str(qty), "rate": str(rate), "amount": str(amount)})
    return saved, subtotal


def _fetch_return(cursor, return_id):
    _ensure_purchase_return_tables(cursor)
    cursor.execute(
        """
        SELECT
            pr.*,
            s.supplier_code,
            s.supplier_name,
            pi.inward_no
        FROM purchase_returns pr
        LEFT JOIN suppliers s ON s.id = pr.supplier_id
        LEFT JOIN purchase_inward pi ON pi.id = pr.purchase_inward_id
        WHERE pr.id = %s
        """,
        (return_id,),
    )
    header = cursor.fetchone()
    if header is None:
        raise HTTPException(status_code=404, detail="Purchase return not found")

    cursor.execute(
        """
        SELECT
            pri.*,
            i.item_code,
            i.item_name,
            i.uom
        FROM purchase_return_items pri
        JOIN items i ON i.id = pri.item_id
        WHERE pri.purchase_return_id = %s
        ORDER BY pri.id ASC
        """,
        (return_id,),
    )
    return {**header, "items": cursor.fetchall()}


@router.get("/next-number")
def get_next_purchase_return_number(return_type: Optional[str] = "PO_DC_RETURN"):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    selected_type = (return_type or "PO_DC_RETURN").upper()
    prefix = RETURN_PREFIXES.get(selected_type, "RTN")

    try:
        _ensure_purchase_return_tables(cursor)
        cursor.execute(
            """
            SELECT return_no
            FROM purchase_returns
            WHERE return_type = %s AND return_no LIKE %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (selected_type, f"{prefix}-%"),
        )
        row = cursor.fetchone()
        current = row["return_no"] if row else ""
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


@router.get("/")
def list_purchase_returns(return_type: Optional[str] = None):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_purchase_return_tables(cursor)
        cursor.execute(
            """
            SELECT
                pr.id,
                pr.return_type,
                pr.return_no,
                pr.return_date,
                pr.reference_no,
                pr.status,
                pr.approval_status,
                pr.subtotal,
                pr.tax_amount,
                pr.total_amount,
                s.supplier_name,
                pi.inward_no,
                COUNT(pri.id) AS item_count,
                SUM(COALESCE(pri.qty, 0)) AS total_qty
            FROM purchase_returns pr
            LEFT JOIN suppliers s ON s.id = pr.supplier_id
            LEFT JOIN purchase_inward pi ON pi.id = pr.purchase_inward_id
            LEFT JOIN purchase_return_items pri ON pri.purchase_return_id = pr.id
            WHERE (%s IS NULL OR pr.return_type = %s)
            GROUP BY pr.id, s.supplier_name, pi.inward_no
            ORDER BY pr.id DESC
            """,
            (return_type, return_type),
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/{return_id}")
def get_purchase_return(return_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        return _fetch_return(cursor, return_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def create_purchase_return(payload: PurchaseReturnPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()
    return_type = (data["returnType"] or "PO_DC_RETURN").upper()

    try:
        _ensure_purchase_return_tables(cursor)
        _ensure_unique_return_no(cursor, data["returnNo"])
        _validate_refs(cursor, data)
        if not data["items"]:
            raise HTTPException(status_code=400, detail="At least one item is required")

        cursor.execute(
            """
            INSERT INTO purchase_returns (
                return_type, return_no, return_date, supplier_id, purchase_inward_id,
                reference_no, reference_date, purchase_ledger, lr_no, so_number,
                tax_percent, status, approval_status, remarks
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, return_no, return_date, status
            """,
            (
                return_type,
                data["returnNo"],
                data["returnDate"],
                data["supplierId"],
                data["purchaseInwardId"],
                data["referenceNo"],
                data["referenceDate"] or None,
                data["purchaseLedger"],
                data["lrNo"],
                data["soNumber"],
                _to_decimal(data["taxPercent"]),
                data["status"] or "Posted",
                data["approvalStatus"] or "Pending",
                data["remarks"],
            ),
        )
        created = cursor.fetchone()
        lines, subtotal = _save_items(cursor, created["id"], payload.items, data["returnNo"])
        tax_percent = _to_decimal(data["taxPercent"])
        tax_amount = (subtotal * tax_percent) / Decimal("100")
        total_amount = subtotal + tax_amount
        cursor.execute(
            """
            UPDATE purchase_returns
            SET subtotal = %s,
                tax_amount = %s,
                total_amount = %s
            WHERE id = %s
            """,
            (subtotal, tax_amount, total_amount, created["id"]),
        )
        connection.commit()
        return {"message": "Purchase return created successfully", "return": created, "items": lines, "totals": {"subtotal": str(subtotal), "tax_amount": str(tax_amount), "total_amount": str(total_amount)}}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
