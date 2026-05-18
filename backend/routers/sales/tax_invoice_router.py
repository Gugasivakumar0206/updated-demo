from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class TaxInvoiceItemPayload(BaseModel):
    itemId: int
    qty: str
    rate: str
    taxPercent: Optional[str] = "0"


class TaxInvoicePayload(BaseModel):
    invoiceNumber: str
    invoiceDate: str
    customerId: int
    salesDcId: Optional[int] = None
    addressType: Optional[str] = "billing"
    invoiceAddress: Optional[str] = None
    items: Optional[List[TaxInvoiceItemPayload]] = None
    itemId: Optional[int] = None
    qty: Optional[str] = None
    rate: Optional[str] = None
    taxPercent: Optional[str] = "0"
    status: Optional[str] = "Draft"
    remarks: Optional[str] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _to_decimal(value):
    return Decimal(str(value or "0"))


def _ensure_tax_invoice_columns(cursor):
    cursor.execute("ALTER TABLE tax_invoices ADD COLUMN IF NOT EXISTS address_type VARCHAR(30) DEFAULT 'billing'")
    cursor.execute("ALTER TABLE tax_invoices ADD COLUMN IF NOT EXISTS invoice_address TEXT")
    cursor.execute("ALTER TABLE tax_invoices ADD COLUMN IF NOT EXISTS pdf_file_name VARCHAR(200)")
    cursor.execute("ALTER TABLE tax_invoices ADD COLUMN IF NOT EXISTS pdf_html TEXT")
    cursor.execute("ALTER TABLE tax_invoices ADD COLUMN IF NOT EXISTS pdf_saved_at TIMESTAMP")


def _normalize_items(data):
    if data.get("items"):
        return data["items"]
    if data.get("itemId") and data.get("qty") and data.get("rate"):
        return [
            {
                "itemId": data["itemId"],
                "qty": data["qty"],
                "rate": data["rate"],
                "taxPercent": data.get("taxPercent") or "0",
            }
        ]
    return []


def _resolve_invoice_address(cursor, customer_id: int, address_type: str | None, invoice_address: str | None):
    cursor.execute(
        """
        SELECT address, delivery_address, city, state, pincode
        FROM customers
        WHERE id = %s
        """,
        (customer_id,),
    )
    customer = cursor.fetchone()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    selected_type = (address_type or "billing").lower()
    billing_address = ", ".join(filter(None, [customer["address"], customer["city"], customer["state"], customer["pincode"]]))
    delivery_address = customer["delivery_address"] or billing_address

    if selected_type == "delivery":
        return "delivery", delivery_address
    if selected_type == "custom":
        return "custom", (invoice_address or "").strip() or billing_address
    return "billing", billing_address


def _validate_refs(cursor, data):
    cursor.execute("SELECT id FROM customers WHERE id = %s", (data["customerId"],))
    if cursor.fetchone() is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    if data["salesDcId"]:
        cursor.execute("SELECT id FROM sales_dc WHERE id = %s", (data["salesDcId"],))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Sales DC not found")


def _ensure_unique_invoice_no(cursor, invoice_no, exclude_id=None):
    cursor.execute(
        """
        SELECT id
        FROM tax_invoices
        WHERE invoice_no = %s
          AND (%s IS NULL OR id <> %s)
        LIMIT 1
        """,
        (invoice_no, exclude_id, exclude_id),
    )
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Tax invoice number already exists")


def _save_invoice_items(cursor, invoice_id, items):
    saved_items = []
    subtotal = Decimal("0")
    gst_amount = Decimal("0")

    for entry in items:
        item_id = int(entry["itemId"])
        qty = _to_decimal(entry["qty"])
        rate = _to_decimal(entry["rate"])
        tax_percent = _to_decimal(entry.get("taxPercent") or "0")

        if qty <= 0:
            raise HTTPException(status_code=400, detail="Qty must be greater than 0")
        if rate < 0:
            raise HTTPException(status_code=400, detail="Rate cannot be negative")

        cursor.execute("SELECT id FROM items WHERE id = %s", (item_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found")

        amount = qty * rate
        line_tax = (amount * tax_percent) / Decimal("100")
        subtotal += amount
        gst_amount += line_tax

        cursor.execute(
            """
            INSERT INTO tax_invoice_items (
                tax_invoice_id, item_id, qty, rate, tax_percent, amount
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (invoice_id, item_id, qty, rate, tax_percent, amount),
        )
        line = cursor.fetchone()
        saved_items.append(
            {
                "id": line["id"],
                "item_id": item_id,
                "qty": str(qty),
                "rate": str(rate),
                "tax_percent": str(tax_percent),
                "amount": str(amount),
            }
        )

    return saved_items, subtotal, gst_amount, subtotal + gst_amount


def _mark_sales_dc_completed(cursor, sales_dc_id):
    if not sales_dc_id:
        return
    cursor.execute("UPDATE sales_dc SET status = 'Completed' WHERE id = %s", (sales_dc_id,))


def _save_pdf_snapshot_name(cursor, invoice_id, invoice_no):
    safe_invoice_no = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in invoice_no)
    cursor.execute(
        """
        UPDATE tax_invoices
        SET pdf_file_name = %s,
            pdf_saved_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """,
        (f"TAX-INVOICE-{safe_invoice_no}.pdf", invoice_id),
    )


@router.get("/next-number")
def get_next_tax_invoice_number():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT invoice_no FROM tax_invoices WHERE invoice_no LIKE 'TAX-%' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        current = row["invoice_no"] if row else ""
        try:
            next_number = int(str(current).split("-")[-1]) + 1
        except ValueError:
            next_number = 1
        return {"nextNumber": f"TAX-{next_number:04d}"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


def _fetch_tax_invoice_details(cursor, invoice_id):
    _ensure_tax_invoice_columns(cursor)
    cursor.execute(
        """
        SELECT
            ti.id,
            ti.invoice_no,
            ti.invoice_date,
            ti.customer_id,
            ti.sales_dc_id,
            ti.address_type,
            ti.invoice_address,
            ti.subtotal,
            ti.gst_amount,
            ti.total_amount,
            ti.status,
            ti.remarks,
            ti.pdf_file_name,
            ti.pdf_saved_at,
            c.customer_code,
            c.customer_name,
            c.address,
            c.city,
            c.state,
            c.pincode,
            c.phone,
            c.mobile,
            c.email,
            c.gstin,
            c.payment_terms,
            c.transport_mode,
            sdc.dc_no,
            sdc.dc_date,
            sdc.po_number,
            sdc.vehicle_no,
            sdc.mode_of_transport
        FROM tax_invoices ti
        JOIN customers c ON c.id = ti.customer_id
        LEFT JOIN sales_dc sdc ON sdc.id = ti.sales_dc_id
        WHERE ti.id = %s
        """,
        (invoice_id,),
    )
    header = cursor.fetchone()
    if header is None:
        raise HTTPException(status_code=404, detail="Tax invoice not found")

    cursor.execute(
        """
        SELECT
            tii.id,
            tii.item_id,
            tii.qty,
            tii.rate,
            tii.tax_percent,
            tii.amount,
            i.item_code,
            i.item_name,
            i.uom,
            i.hsn_code
        FROM tax_invoice_items tii
        JOIN items i ON i.id = tii.item_id
        WHERE tii.tax_invoice_id = %s
        ORDER BY tii.id ASC
        """,
        (invoice_id,),
    )
    items = cursor.fetchall()
    first = items[0] if items else {}

    return {
        **header,
        "item_id": first.get("item_id"),
        "qty": first.get("qty"),
        "rate": first.get("rate"),
        "tax_percent": first.get("tax_percent"),
        "amount": first.get("amount"),
        "item_code": first.get("item_code"),
        "item_name": first.get("item_name"),
        "uom": first.get("uom"),
        "hsn_code": first.get("hsn_code"),
        "items": items,
    }


@router.get("/")
def list_tax_invoices():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_tax_invoice_columns(cursor)
        cursor.execute(
            """
            SELECT
                ti.id,
                ti.invoice_no,
                ti.invoice_date,
                ti.subtotal,
                ti.gst_amount,
                ti.total_amount,
                ti.status,
                ti.pdf_file_name,
                ti.pdf_saved_at,
                c.customer_name,
                COUNT(tii.id) AS item_count,
                SUM(COALESCE(tii.qty, 0)) AS total_qty
            FROM tax_invoices ti
            JOIN customers c ON c.id = ti.customer_id
            LEFT JOIN tax_invoice_items tii ON tii.tax_invoice_id = ti.id
            GROUP BY ti.id, c.customer_name
            ORDER BY ti.id DESC
            """
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/{invoice_id}")
def get_tax_invoice(invoice_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        return _fetch_tax_invoice_details(cursor, invoice_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def create_tax_invoice(payload: TaxInvoicePayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()
    normalized_items = _normalize_items(data)

    try:
        _ensure_tax_invoice_columns(cursor)
        _ensure_unique_invoice_no(cursor, data["invoiceNumber"])
        _validate_refs(cursor, data)
        if not normalized_items:
            raise HTTPException(status_code=400, detail="At least one item is required")

        address_type, resolved_invoice_address = _resolve_invoice_address(
            cursor,
            data["customerId"],
            data.get("addressType"),
            data.get("invoiceAddress"),
        )

        cursor.execute(
            """
            INSERT INTO tax_invoices (
                invoice_no, invoice_date, customer_id, sales_dc_id, address_type, invoice_address,
                subtotal, gst_amount, total_amount, status, remarks
            )
            VALUES (%s, %s, %s, %s, %s, %s, 0, 0, 0, %s, %s)
            RETURNING id, invoice_no, invoice_date, total_amount, status
            """,
            (
                data["invoiceNumber"],
                data["invoiceDate"],
                data["customerId"],
                data["salesDcId"],
                address_type,
                resolved_invoice_address,
                data["status"] or "Draft",
                data["remarks"],
            ),
        )
        invoice = cursor.fetchone()
        lines, subtotal, gst_amount, total_amount = _save_invoice_items(cursor, invoice["id"], normalized_items)

        cursor.execute(
            """
            UPDATE tax_invoices
            SET subtotal = %s,
                gst_amount = %s,
                total_amount = %s
            WHERE id = %s
            RETURNING id, invoice_no, invoice_date, total_amount, status
            """,
            (subtotal, gst_amount, total_amount, invoice["id"]),
        )
        invoice = cursor.fetchone()
        _save_pdf_snapshot_name(cursor, invoice["id"], invoice["invoice_no"])
        _mark_sales_dc_completed(cursor, data["salesDcId"])
        connection.commit()

        return {
            "message": "Tax invoice created successfully",
            "invoice": invoice,
            "items": lines,
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


@router.put("/{invoice_id}")
def update_tax_invoice(invoice_id: int, payload: TaxInvoicePayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()
    normalized_items = _normalize_items(data)

    try:
        _ensure_tax_invoice_columns(cursor)
        cursor.execute("SELECT id FROM tax_invoices WHERE id = %s", (invoice_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Tax invoice not found")

        _ensure_unique_invoice_no(cursor, data["invoiceNumber"], invoice_id)
        _validate_refs(cursor, data)
        if not normalized_items:
            raise HTTPException(status_code=400, detail="At least one item is required")

        address_type, resolved_invoice_address = _resolve_invoice_address(
            cursor,
            data["customerId"],
            data.get("addressType"),
            data.get("invoiceAddress"),
        )

        cursor.execute(
            """
            UPDATE tax_invoices
            SET
                invoice_no = %s,
                invoice_date = %s,
                customer_id = %s,
                sales_dc_id = %s,
                address_type = %s,
                invoice_address = %s,
                status = %s,
                remarks = %s
            WHERE id = %s
            RETURNING id, invoice_no, invoice_date, total_amount, status
            """,
            (
                data["invoiceNumber"],
                data["invoiceDate"],
                data["customerId"],
                data["salesDcId"],
                address_type,
                resolved_invoice_address,
                data["status"] or "Draft",
                data["remarks"],
                invoice_id,
            ),
        )
        invoice = cursor.fetchone()
        cursor.execute("DELETE FROM tax_invoice_items WHERE tax_invoice_id = %s", (invoice_id,))
        lines, subtotal, gst_amount, total_amount = _save_invoice_items(cursor, invoice_id, normalized_items)

        cursor.execute(
            """
            UPDATE tax_invoices
            SET subtotal = %s,
                gst_amount = %s,
                total_amount = %s
            WHERE id = %s
            RETURNING id, invoice_no, invoice_date, total_amount, status
            """,
            (subtotal, gst_amount, total_amount, invoice_id),
        )
        invoice = cursor.fetchone()
        _save_pdf_snapshot_name(cursor, invoice["id"], invoice["invoice_no"])
        _mark_sales_dc_completed(cursor, data["salesDcId"])
        connection.commit()

        return {
            "message": "Tax invoice updated successfully",
            "invoice": invoice,
            "items": lines,
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
def delete_tax_invoice(invoice_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT id, invoice_no FROM tax_invoices WHERE id = %s", (invoice_id,))
        invoice = cursor.fetchone()
        if invoice is None:
            raise HTTPException(status_code=404, detail="Tax invoice not found")

        cursor.execute("DELETE FROM tax_invoice_items WHERE tax_invoice_id = %s", (invoice_id,))
        cursor.execute("DELETE FROM tax_invoices WHERE id = %s", (invoice_id,))
        connection.commit()

        return {
            "message": "Tax invoice deleted successfully",
            "invoice": invoice,
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
