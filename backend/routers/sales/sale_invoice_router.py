
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class SaleInvoicePayload(BaseModel):
    invoiceNumber: str
    invoiceDate: str
    customerId: int
    salesDcId: Optional[int] = None
    itemId: int
    qty: str
    rate: str
    taxPercent: str
    status: Optional[str] = "Draft"
    remarks: Optional[str] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


@router.get("/")
def list_sale_invoices():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                si.id,
                si.invoice_no,
                si.invoice_date,
                si.subtotal,
                si.gst_amount,
                si.total_amount,
                si.status,
                c.customer_name,
                sii.item_id,
                i.item_code,
                i.item_name,
                sii.qty,
                sii.rate,
                sii.tax_percent,
                sii.amount
            FROM sale_invoices si
            JOIN customers c ON c.id = si.customer_id
            JOIN sale_invoice_items sii ON sii.sale_invoice_id = si.id
            JOIN items i ON i.id = sii.item_id
            ORDER BY si.id DESC, sii.id DESC
            """
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def create_sale_invoice(payload: SaleInvoicePayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    qty = Decimal(str(data["qty"]))
    rate = Decimal(str(data["rate"]))
    tax_percent = Decimal(str(data["taxPercent"]))
    subtotal = qty * rate
    gst_amount = (subtotal * tax_percent) / Decimal("100")
    total_amount = subtotal + gst_amount

    try:
        cursor.execute("SELECT id FROM customers WHERE id = %s", (data["customerId"],))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Customer not found")

        cursor.execute("SELECT id FROM items WHERE id = %s", (data["itemId"],))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Item not found")

        if data["salesDcId"]:
            cursor.execute("SELECT id FROM sales_dc WHERE id = %s", (data["salesDcId"],))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Sales DC not found")

        cursor.execute(
            """
            INSERT INTO sale_invoices (
                invoice_no, invoice_date, customer_id, sales_dc_id,
                subtotal, gst_amount, total_amount, status, remarks
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, invoice_no, invoice_date, total_amount, status
            """,
            (
                data["invoiceNumber"],
                data["invoiceDate"],
                data["customerId"],
                data["salesDcId"],
                subtotal,
                gst_amount,
                total_amount,
                data["status"],
                data["remarks"],
            ),
        )
        invoice = cursor.fetchone()

        cursor.execute(
            """
            INSERT INTO sale_invoice_items (
                sale_invoice_id, item_id, qty, rate, tax_percent, amount
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                invoice["id"],
                data["itemId"],
                qty,
                rate,
                tax_percent,
                subtotal,
            ),
        )
        line = cursor.fetchone()
        connection.commit()

        return {
            "message": "Sale invoice created successfully",
            "invoice": invoice,
            "line": {
                "id": line["id"],
                "item_id": data["itemId"],
                "qty": str(qty),
                "rate": str(rate),
                "tax_percent": str(tax_percent),
                "amount": str(subtotal),
            },
            "totals": {
                "subtotal": str(subtotal),
                "gst_amount": str(gst_amount),
                "total_amount": str(total_amount),
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


@router.delete("/{invoice_id}")
def delete_sale_invoice(invoice_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "SELECT id, invoice_no FROM sale_invoices WHERE id = %s",
            (invoice_id,),
        )
        invoice = cursor.fetchone()
        if invoice is None:
            raise HTTPException(status_code=404, detail="Sale invoice not found")

        cursor.execute(
            "DELETE FROM sale_invoice_items WHERE sale_invoice_id = %s",
            (invoice_id,),
        )
        cursor.execute(
            "DELETE FROM sale_invoices WHERE id = %s",
            (invoice_id,),
        )
        connection.commit()

        return {
            "message": "Sale invoice deleted successfully",
            "invoice": {
                "id": invoice["id"],
                "invoice_no": invoice["invoice_no"],
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
