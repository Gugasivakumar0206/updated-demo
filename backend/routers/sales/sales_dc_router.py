from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import Json, RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class SalesDCItemPayload(BaseModel):
    itemId: int
    qty: str
    hsnCode: Optional[str] = None


class SalesDCPayload(BaseModel):
    dcNumber: str
    dcDate: str
    customerId: int
    poNumber: Optional[str] = None
    referenceNumber: Optional[str] = None
    vehicleNo: Optional[str] = None
    modeOfTransport: Optional[str] = None
    status: Optional[str] = "Open"
    remarks: Optional[str] = None
    invoiceIds: Optional[List[int]] = None
    items: Optional[List[SalesDCItemPayload]] = None
    itemId: Optional[int] = None
    qty: Optional[str] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _to_decimal(value):
    return Decimal(str(value or "0"))


def _ensure_sales_dc_columns(cursor):
    cursor.execute(
        """
        ALTER TABLE sales_dc
        ADD COLUMN IF NOT EXISTS po_number VARCHAR(100)
        """
    )
    cursor.execute(
        """
        ALTER TABLE sales_dc
        ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100)
        """
    )
    cursor.execute(
        """
        ALTER TABLE sales_dc
        ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(50)
        """
    )
    cursor.execute(
        """
        ALTER TABLE sales_dc
        ADD COLUMN IF NOT EXISTS mode_of_transport VARCHAR(50)
        """
    )
    cursor.execute(
        """
        ALTER TABLE sales_dc_items
        ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50)
        """
    )
    cursor.execute(
        """
        ALTER TABLE sales_dc
        ADD COLUMN IF NOT EXISTS linked_invoice_ids JSONB
        """
    )


def _normalize_items(data):
    if data.get("items"):
        return data["items"]
    if data.get("itemId") and data.get("qty"):
        return [{"itemId": data["itemId"], "qty": data["qty"]}]
    return []


def _fetch_customer(cursor, customer_id):
    cursor.execute(
        """
        SELECT
            id,
            customer_code,
            customer_name,
            gstin,
            email,
            mobile,
            phone,
            address,
            delivery_address,
            city,
            state,
            pincode
        FROM customers
        WHERE id = %s
        """,
        (customer_id,),
    )
    customer = cursor.fetchone()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


def _fetch_item(cursor, item_id):
    cursor.execute(
        """
        SELECT
            id,
            item_code,
            item_name,
            uom,
            hsn_code,
            sales_rate
        FROM items
        WHERE id = %s
        """,
        (item_id,),
    )
    item = cursor.fetchone()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


def _ensure_unique_dc_no(cursor, dc_no, exclude_id=None):
    cursor.execute(
        """
        SELECT id
        FROM sales_dc
        WHERE dc_no = %s
          AND (%s IS NULL OR id <> %s)
        LIMIT 1
        """,
        (dc_no, exclude_id, exclude_id),
    )
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Sales DC number already exists")


@router.get("/next-number")
def get_next_sales_dc_number():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT dc_no FROM sales_dc WHERE dc_no LIKE 'SDC-%' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        current = row["dc_no"] if row else ""
        try:
            next_number = int(str(current).split("-")[-1]) + 1
        except ValueError:
            next_number = 1
        return {"nextNumber": f"SDC-{next_number:04d}"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


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


def _apply_stock_delta(cursor, item_id, ref_id, delta_qty, remarks):
    if delta_qty == 0:
        return

    current_balance = _latest_balance(cursor, item_id)
    delta_qty = _to_decimal(delta_qty)

    if delta_qty > 0 and current_balance < delta_qty:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available stock is {current_balance}",
        )

    inward_qty = Decimal("0")
    outward_qty = Decimal("0")
    new_balance = current_balance
    ref_type = "SALES_DC"

    if delta_qty > 0:
        outward_qty = delta_qty
        new_balance = current_balance - delta_qty
    else:
        inward_qty = abs(delta_qty)
        new_balance = current_balance + abs(delta_qty)
        ref_type = "SALES_DC_EDIT_RETURN"

    cursor.execute(
        """
        INSERT INTO stock_ledger (
            item_id, ref_type, ref_id, inward_qty, outward_qty, balance_qty, remarks
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            item_id,
            ref_type,
            ref_id,
            inward_qty,
            outward_qty,
            new_balance,
            remarks,
        ),
    )


def _save_sales_dc_items(cursor, sales_dc_id, normalized_items, original_qty_map=None, dc_number=""):
    original_qty_map = original_qty_map or {}
    new_qty_map = {}
    saved_lines = []

    for entry in normalized_items:
        item_id = int(entry["itemId"])
        qty = _to_decimal(entry["qty"])
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Qty must be greater than 0")

        item = _fetch_item(cursor, item_id)
        hsn_code = entry.get("hsnCode") or item["hsn_code"] or ""
        new_qty_map[item_id] = new_qty_map.get(item_id, Decimal("0")) + qty

        cursor.execute(
            """
            INSERT INTO sales_dc_items (
                sales_dc_id, item_id, qty, returned_qty, pending_qty, hsn_code
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (sales_dc_id, item_id, qty, Decimal("0"), qty, hsn_code),
        )
        line = cursor.fetchone()
        saved_lines.append(
            {
                "id": line["id"],
                "item_id": item["id"],
                "item_code": item["item_code"],
                "item_name": item["item_name"],
                "uom": item["uom"],
                "hsn_code": hsn_code,
                "qty": str(qty),
                "rate": str(item["sales_rate"] or 0),
                "amount": str(qty * _to_decimal(item["sales_rate"])),
            }
        )

    item_ids = set(original_qty_map.keys()) | set(new_qty_map.keys())
    for item_id in item_ids:
        original_qty = original_qty_map.get(item_id, Decimal("0"))
        new_qty = new_qty_map.get(item_id, Decimal("0"))
        delta = new_qty - original_qty
        _apply_stock_delta(
            cursor,
            item_id,
            sales_dc_id,
            delta,
            f"Sales DC {dc_number}",
        )

    return saved_lines


def _fetch_sales_dc_details(cursor, sales_dc_id):
    _ensure_sales_dc_columns(cursor)
    cursor.execute(
        """
        SELECT
            sd.id,
            sd.dc_no,
            sd.dc_date,
            sd.po_number,
            sd.reference_no,
            sd.vehicle_no,
            sd.mode_of_transport,
            sd.linked_invoice_ids,
            sd.status,
            sd.remarks,
            c.id AS customer_id,
            c.customer_code,
            c.customer_name,
            c.gstin,
            c.email,
            c.mobile,
            c.phone,
            c.address,
            c.delivery_address,
            c.city,
            c.state,
            c.pincode
        FROM sales_dc sd
        JOIN customers c ON c.id = sd.customer_id
        WHERE sd.id = %s
        """,
        (sales_dc_id,),
    )
    header = cursor.fetchone()
    if header is None:
        raise HTTPException(status_code=404, detail="Sales DC not found")

    cursor.execute(
        """
        SELECT
            sdi.id,
            sdi.item_id,
            sdi.qty,
            sdi.returned_qty,
            sdi.pending_qty,
            sdi.hsn_code,
            i.item_code,
            i.item_name,
            i.uom,
            i.sales_rate,
            (COALESCE(i.sales_rate, 0) * COALESCE(sdi.qty, 0)) AS amount
        FROM sales_dc_items sdi
        JOIN items i ON i.id = sdi.item_id
        WHERE sdi.sales_dc_id = %s
        ORDER BY sdi.id ASC
        """,
        (sales_dc_id,),
    )
    items = cursor.fetchall()

    total_qty = sum(_to_decimal(item["qty"]) for item in items)
    total_amount = sum(_to_decimal(item["amount"]) for item in items)

    return {
        "id": header["id"],
        "dc_no": header["dc_no"],
        "dc_date": str(header["dc_date"]),
        "po_number": header["po_number"],
        "reference_no": header["reference_no"],
        "vehicle_no": header["vehicle_no"],
        "mode_of_transport": header["mode_of_transport"],
        "linked_invoice_ids": header["linked_invoice_ids"] or [],
        "status": header["status"],
        "remarks": header["remarks"],
        "customer": {
            "id": header["customer_id"],
            "customer_code": header["customer_code"],
            "customer_name": header["customer_name"],
            "gstin": header["gstin"],
            "email": header["email"],
            "mobile": header["mobile"],
            "phone": header["phone"],
            "address": header["address"],
            "delivery_address": header["delivery_address"],
            "city": header["city"],
            "state": header["state"],
            "pincode": header["pincode"],
        },
        "items": [
            {
                "id": item["id"],
                "item_id": item["item_id"],
                "item_code": item["item_code"],
                "item_name": item["item_name"],
                "uom": item["uom"],
                "hsn_code": item["hsn_code"] or "",
                "sales_rate": str(item["sales_rate"] or 0),
                "qty": str(item["qty"]),
                "returned_qty": str(item["returned_qty"] or 0),
                "pending_qty": str(item["pending_qty"] or 0),
                "amount": str(item["amount"] or 0),
            }
            for item in items
        ],
        "summary": {
            "total_qty": str(total_qty),
            "total_amount": str(total_amount),
        },
    }


@router.get("/")
def list_sales_dc():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_sales_dc_columns(cursor)
        cursor.execute(
            """
            SELECT
                sd.id,
                sd.dc_no,
                sd.dc_date,
                sd.po_number,
                sd.reference_no,
                sd.vehicle_no,
                sd.mode_of_transport,
                sd.linked_invoice_ids,
                sd.status,
                sd.remarks,
                c.id AS customer_id,
                c.customer_name,
                STRING_AGG(DISTINCT COALESCE(sdi.hsn_code, i.hsn_code), ', ') AS hsn_codes,
                SUM(COALESCE(sdi.qty, 0)) AS total_qty,
                SUM(COALESCE(i.sales_rate, 0) * COALESCE(sdi.qty, 0)) AS total_amount
            FROM sales_dc sd
            JOIN customers c ON c.id = sd.customer_id
            LEFT JOIN sales_dc_items sdi ON sdi.sales_dc_id = sd.id
            LEFT JOIN items i ON i.id = sdi.item_id
            GROUP BY
                sd.id,
                sd.dc_no,
                sd.dc_date,
                sd.po_number,
                sd.reference_no,
                sd.vehicle_no,
                sd.mode_of_transport,
                sd.linked_invoice_ids,
                sd.status,
                sd.remarks,
                c.id,
                c.customer_name
            ORDER BY sd.id DESC
            """
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/{sales_dc_id}")
def get_sales_dc_by_id(sales_dc_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        return _fetch_sales_dc_details(cursor, sales_dc_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def create_sales_dc(payload: SalesDCPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_sales_dc_columns(cursor)
        _ensure_unique_dc_no(cursor, data["dcNumber"])
        _fetch_customer(cursor, data["customerId"])
        normalized_items = _normalize_items(data)
        if not normalized_items:
            raise HTTPException(status_code=400, detail="At least one item is required")

        cursor.execute(
            """
            INSERT INTO sales_dc (
                dc_no, dc_date, customer_id, po_number, reference_no, vehicle_no, mode_of_transport,
                linked_invoice_ids, remarks, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, dc_no, dc_date, status
            """,
            (
                data["dcNumber"],
                data["dcDate"],
                data["customerId"],
                data["poNumber"],
                data["referenceNumber"],
                data["vehicleNo"],
                data["modeOfTransport"],
                Json(data.get("invoiceIds") or []),
                data["remarks"],
                data["status"] or "Open",
            ),
        )
        sales_dc = cursor.fetchone()

        lines = _save_sales_dc_items(
            cursor,
            sales_dc["id"],
            normalized_items,
            original_qty_map={},
            dc_number=data["dcNumber"],
        )

        connection.commit()
        details = _fetch_sales_dc_details(cursor, sales_dc["id"])
        return {
            "message": "Sales DC created successfully",
            "salesDc": sales_dc,
            "items": lines,
            "summary": details["summary"],
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


@router.put("/{sales_dc_id}")
def update_sales_dc(sales_dc_id: int, payload: SalesDCPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_sales_dc_columns(cursor)
        cursor.execute("SELECT id FROM sales_dc WHERE id = %s", (sales_dc_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Sales DC not found")

        _ensure_unique_dc_no(cursor, data["dcNumber"], sales_dc_id)
        _fetch_customer(cursor, data["customerId"])
        normalized_items = _normalize_items(data)
        if not normalized_items:
            raise HTTPException(status_code=400, detail="At least one item is required")

        cursor.execute(
            """
            SELECT item_id, qty
            FROM sales_dc_items
            WHERE sales_dc_id = %s
            """,
            (sales_dc_id,),
        )
        original_rows = cursor.fetchall()
        original_qty_map = {}
        for row in original_rows:
            item_id = row["item_id"]
            original_qty_map[item_id] = original_qty_map.get(item_id, Decimal("0")) + _to_decimal(row["qty"])

        cursor.execute(
            """
            UPDATE sales_dc
            SET
                dc_no = %s,
                dc_date = %s,
                customer_id = %s,
                po_number = %s,
                reference_no = %s,
                vehicle_no = %s,
                mode_of_transport = %s,
                linked_invoice_ids = %s,
                remarks = %s,
                status = %s
            WHERE id = %s
            RETURNING id, dc_no, dc_date, status
            """,
            (
                data["dcNumber"],
                data["dcDate"],
                data["customerId"],
                data["poNumber"],
                data["referenceNumber"],
                data["vehicleNo"],
                data["modeOfTransport"],
                Json(data.get("invoiceIds") or []),
                data["remarks"],
                data["status"] or "Open",
                sales_dc_id,
            ),
        )
        sales_dc = cursor.fetchone()

        cursor.execute("DELETE FROM sales_dc_items WHERE sales_dc_id = %s", (sales_dc_id,))
        lines = _save_sales_dc_items(
            cursor,
            sales_dc_id,
            normalized_items,
            original_qty_map=original_qty_map,
            dc_number=data["dcNumber"],
        )

        connection.commit()
        details = _fetch_sales_dc_details(cursor, sales_dc_id)
        return {
            "message": "Sales DC updated successfully",
            "salesDc": sales_dc,
            "items": lines,
            "summary": details["summary"],
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


@router.delete("/{sales_dc_id}")
def delete_sales_dc(sales_dc_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_sales_dc_columns(cursor)
        cursor.execute("SELECT id, dc_no FROM sales_dc WHERE id = %s", (sales_dc_id,))
        sales_dc = cursor.fetchone()
        if sales_dc is None:
            raise HTTPException(status_code=404, detail="Sales DC not found")

        cursor.execute(
            """
            SELECT item_id, qty
            FROM sales_dc_items
            WHERE sales_dc_id = %s
            """,
            (sales_dc_id,),
        )
        item_rows = cursor.fetchall()
        for row in item_rows:
            _apply_stock_delta(
                cursor,
                row["item_id"],
                sales_dc_id,
                -_to_decimal(row["qty"]),
                f"Sales DC deleted {sales_dc['dc_no']}",
            )

        cursor.execute("DELETE FROM sales_dc_items WHERE sales_dc_id = %s", (sales_dc_id,))
        cursor.execute("DELETE FROM sales_dc WHERE id = %s", (sales_dc_id,))
        connection.commit()
        return {"message": "Sales DC deleted successfully", "salesDc": sales_dc}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
