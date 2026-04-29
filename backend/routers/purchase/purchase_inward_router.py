from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class PurchaseInwardPayload(BaseModel):
    inwardType: Optional[str] = "GRN"
    inwardNo: str
    inwardDate: str
    supplierId: int
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


@router.get("/")
def list_purchase_inwards(inward_type: Optional[str] = None):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_inward_type_column(cursor)
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
                data["inwardType"] or "GRN",
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
                f'PURCHASE_INWARD_{(data["inwardType"] or "GRN").upper().replace(" ", "_")}',
                purchase["id"],
                qty,
                Decimal("0"),
                new_balance,
                data["remarks"] or f"Inward {data['inwardNo']}",
            ),
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
