import csv
import io
from decimal import Decimal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _decimal(value):
    return Decimal(str(value or 0))


def _to_float_dict(summary):
    return {key: float(value) if isinstance(value, Decimal) else value for key, value in summary.items()}


def _fetch_inventory_rows():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                i.id,
                i.item_code,
                i.item_name,
                i.item_group,
                i.uom,
                i.purchase_rate,
                i.sales_rate,
                i.status,
                COALESCE(sl.balance_qty, 0) AS current_stock,
                COALESCE(sl.balance_qty, 0) * COALESCE(i.purchase_rate, 0) AS stock_value
            FROM items i
            LEFT JOIN (
                SELECT DISTINCT ON (item_id)
                    item_id,
                    balance_qty
                FROM stock_ledger
                ORDER BY item_id, entry_date DESC, id DESC
            ) sl ON sl.item_id = i.id
            ORDER BY i.item_name ASC
            """
        )
        rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()

    normalized = []
    total_stock_qty = Decimal("0")
    total_stock_value = Decimal("0")

    for row in rows:
        current_stock = _decimal(row["current_stock"])
        purchase_rate = _decimal(row["purchase_rate"])
        sales_rate = _decimal(row["sales_rate"])
        stock_value = _decimal(row["stock_value"])

        total_stock_qty += current_stock
        total_stock_value += stock_value

        normalized.append(
            {
                "id": row["id"],
                "item_code": row["item_code"],
                "item_name": row["item_name"],
                "item_group": row["item_group"],
                "uom": row["uom"],
                "purchase_rate": float(purchase_rate),
                "sales_rate": float(sales_rate),
                "status": row["status"],
                "current_stock": float(current_stock),
                "stock_value": float(stock_value),
            }
        )

    return normalized, {
        "total_items": len(normalized),
        "total_stock_qty": total_stock_qty,
        "total_stock_value": total_stock_value,
    }


def _fetch_purchase_rows():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                pi.id,
                pi.inward_no,
                pi.inward_date,
                pi.status,
                s.supplier_name,
                c.customer_name,
                i.item_code,
                i.item_name,
                pii.qty,
                pii.rate,
                pii.amount
            FROM purchase_inward pi
            LEFT JOIN suppliers s ON s.id = pi.supplier_id
            LEFT JOIN customers c ON c.id = pi.customer_id
            JOIN purchase_inward_items pii ON pii.inward_id = pi.id
            JOIN items i ON i.id = pii.item_id
            ORDER BY pi.id DESC, pii.id DESC
            """
        )
        rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()

    total_qty = Decimal("0")
    total_amount = Decimal("0")
    normalized = []
    inward_ids = set()

    for row in rows:
        qty = _decimal(row["qty"])
        amount = _decimal(row["amount"])
        total_qty += qty
        total_amount += amount
        inward_ids.add(row["id"])
        normalized.append(
            {
                "id": row["id"],
                "inward_no": row["inward_no"],
                "inward_date": row["inward_date"],
                "supplier_name": row["supplier_name"] or "-",
                "customer_name": row["customer_name"] or "-",
                "item_code": row["item_code"],
                "item_name": row["item_name"],
                "qty": float(qty),
                "rate": float(_decimal(row["rate"])),
                "amount": float(amount),
                "status": row["status"] or "-",
            }
        )

    return normalized, {
        "total_inwards": len(inward_ids),
        "total_qty": total_qty,
        "total_amount": total_amount,
    }


def _fetch_inward_rows():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
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
                s.supplier_name,
                c.customer_name,
                i.item_code,
                i.item_name,
                pii.qty,
                pii.rate,
                pii.amount
            FROM purchase_inward pi
            LEFT JOIN suppliers s ON s.id = pi.supplier_id
            LEFT JOIN customers c ON c.id = pi.customer_id
            JOIN purchase_inward_items pii ON pii.inward_id = pi.id
            JOIN items i ON i.id = pii.item_id
            ORDER BY pi.inward_date DESC, pi.id DESC, pii.id DESC
            """
        )
        rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()

    total_qty = Decimal("0")
    total_amount = Decimal("0")
    inward_ids = set()
    inward_types = set()
    normalized = []

    for row in rows:
        qty = _decimal(row["qty"])
        amount = _decimal(row["amount"])
        inward_type = row["inward_type"] or "-"
        total_qty += qty
        total_amount += amount
        inward_ids.add(row["id"])
        inward_types.add(inward_type)

        normalized.append(
            {
                "id": row["id"],
                "inward_type": inward_type,
                "inward_no": row["inward_no"],
                "inward_date": row["inward_date"],
                "invoice_no": row["invoice_no"] or "-",
                "vehicle_no": row["vehicle_no"] or "-",
                "supplier_name": row["supplier_name"] or "-",
                "customer_name": row["customer_name"] or "-",
                "item_code": row["item_code"],
                "item_name": row["item_name"],
                "qty": float(qty),
                "rate": float(_decimal(row["rate"])),
                "amount": float(amount),
                "status": row["status"] or "-",
            }
        )

    return normalized, {
        "total_inwards": Decimal(str(len(inward_ids))),
        "inward_types": Decimal(str(len(inward_types))),
        "total_qty": total_qty,
        "total_amount": total_amount,
    }


def _fetch_lo_inward_rows():
    rows, _summary = _fetch_inward_rows()
    filtered = [row for row in rows if (row.get("inward_type") or "").upper() == "LO"]

    total_qty = Decimal("0")
    total_amount = Decimal("0")
    inward_ids = set()

    for row in filtered:
        total_qty += _decimal(row["qty"])
        total_amount += _decimal(row["amount"])
        inward_ids.add(row["id"])

    return filtered, {
        "total_lo_inwards": Decimal(str(len(inward_ids))),
        "total_qty": total_qty,
        "total_amount": total_amount,
    }


def _fetch_manufacturing_rows():
    rows, inventory_summary = _fetch_inventory_rows()
    active_items = sum(1 for row in rows if (row.get("status") or "").lower() == "active")

    normalized = [
        {
            "id": row["id"],
            "item_code": row["item_code"],
            "item_name": row["item_name"],
            "item_group": row["item_group"] or "-",
            "uom": row["uom"] or "-",
            "current_stock": row["current_stock"],
            "sales_rate": row["sales_rate"],
            "status": row["status"] or "-",
        }
        for row in rows
    ]

    return normalized, {
        "total_items": Decimal(str(inventory_summary["total_items"])),
        "active_items": Decimal(str(active_items)),
        "total_stock_qty": _decimal(inventory_summary["total_stock_qty"]),
    }


def _fetch_sales_rows():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                sd.id,
                sd.dc_no,
                sd.dc_date,
                sd.status,
                c.customer_name,
                i.item_code,
                i.item_name,
                i.uom,
                COALESCE(i.sales_rate, 0) AS sales_rate,
                sdi.qty,
                COALESCE(i.sales_rate, 0) * COALESCE(sdi.qty, 0) AS amount
            FROM sales_dc sd
            JOIN sales_dc_items sdi ON sdi.sales_dc_id = sd.id
            JOIN customers c ON c.id = sd.customer_id
            JOIN items i ON i.id = sdi.item_id
            ORDER BY sd.id DESC, sdi.id DESC
            """
        )
        rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()

    total_qty = Decimal("0")
    total_amount = Decimal("0")
    customer_names = set()
    normalized = []

    for row in rows:
        qty = _decimal(row["qty"])
        amount = _decimal(row["amount"])
        total_qty += qty
        total_amount += amount
        customer_names.add(row["customer_name"])
        normalized.append(
            {
                "id": row["id"],
                "dc_no": row["dc_no"],
                "dc_date": row["dc_date"],
                "customer_name": row["customer_name"],
                "item_code": row["item_code"],
                "item_name": row["item_name"],
                "uom": row["uom"] or "-",
                "qty": float(qty),
                "rate": float(_decimal(row["sales_rate"])),
                "amount": float(amount),
                "status": row["status"] or "-",
            }
        )

    return normalized, {
        "total_sales_lines": Decimal(str(len(normalized))),
        "total_qty": total_qty,
        "total_amount": total_amount,
        "customers_served": Decimal(str(len(customer_names))),
    }


def _fetch_dc_summary_rows():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                sd.id,
                sd.dc_no,
                sd.dc_date,
                sd.status,
                c.customer_name,
                i.item_code,
                i.item_name,
                sdi.qty,
                sdi.returned_qty,
                sdi.pending_qty
            FROM sales_dc sd
            JOIN sales_dc_items sdi ON sdi.sales_dc_id = sd.id
            JOIN customers c ON c.id = sd.customer_id
            JOIN items i ON i.id = sdi.item_id
            ORDER BY sd.id DESC, sdi.id DESC
            """
        )
        rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()

    total_qty = Decimal("0")
    total_pending = Decimal("0")
    total_returned = Decimal("0")
    dc_ids = set()
    normalized = []

    for row in rows:
        qty = _decimal(row["qty"])
        pending = _decimal(row["pending_qty"])
        returned = _decimal(row["returned_qty"])
        total_qty += qty
        total_pending += pending
        total_returned += returned
        dc_ids.add(row["id"])
        normalized.append(
            {
                "id": row["id"],
                "dc_no": row["dc_no"],
                "dc_date": row["dc_date"],
                "customer_name": row["customer_name"],
                "item_code": row["item_code"],
                "item_name": row["item_name"],
                "qty": float(qty),
                "returned_qty": float(returned),
                "pending_qty": float(pending),
                "status": row["status"] or "-",
            }
        )

    return normalized, {
        "total_dcs": Decimal(str(len(dc_ids))),
        "total_qty": total_qty,
        "total_pending_qty": total_pending,
        "total_returned_qty": total_returned,
    }


def _fetch_invoice_rows():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                'Tax Invoice' AS invoice_type,
                ti.id,
                ti.invoice_no,
                ti.invoice_date,
                c.customer_name,
                ti.subtotal,
                ti.gst_amount,
                ti.total_amount,
                ti.status
            FROM tax_invoices ti
            JOIN customers c ON c.id = ti.customer_id
            UNION ALL
            SELECT
                'Sale Invoice' AS invoice_type,
                si.id,
                si.invoice_no,
                si.invoice_date,
                c.customer_name,
                si.subtotal,
                si.gst_amount,
                si.total_amount,
                si.status
            FROM sale_invoices si
            JOIN customers c ON c.id = si.customer_id
            ORDER BY invoice_date DESC, id DESC
            """
        )
        rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()

    total_subtotal = Decimal("0")
    total_gst = Decimal("0")
    total_amount = Decimal("0")
    normalized = []

    for row in rows:
        subtotal = _decimal(row["subtotal"])
        gst_amount = _decimal(row["gst_amount"])
        amount = _decimal(row["total_amount"])
        total_subtotal += subtotal
        total_gst += gst_amount
        total_amount += amount
        normalized.append(
            {
                "id": f'{row["invoice_type"]}-{row["id"]}',
                "invoice_type": row["invoice_type"],
                "invoice_no": row["invoice_no"],
                "invoice_date": row["invoice_date"],
                "customer_name": row["customer_name"],
                "subtotal": float(subtotal),
                "gst_amount": float(gst_amount),
                "total_amount": float(amount),
                "status": row["status"] or "-",
            }
        )

    return normalized, {
        "total_invoices": Decimal(str(len(normalized))),
        "subtotal_value": total_subtotal,
        "gst_value": total_gst,
        "net_value": total_amount,
    }


def _fetch_rejection_rows():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                sd.id,
                sd.dc_no,
                sd.dc_date,
                c.customer_name,
                i.item_code,
                i.item_name,
                sdi.qty,
                sdi.returned_qty,
                sdi.pending_qty
            FROM sales_dc sd
            JOIN sales_dc_items sdi ON sdi.sales_dc_id = sd.id
            JOIN customers c ON c.id = sd.customer_id
            JOIN items i ON i.id = sdi.item_id
            WHERE COALESCE(sdi.returned_qty, 0) > 0 OR COALESCE(sdi.pending_qty, 0) > 0
            ORDER BY sd.id DESC, sdi.id DESC
            """
        )
        rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()

    total_returned = Decimal("0")
    total_pending = Decimal("0")
    normalized = []

    for row in rows:
        returned = _decimal(row["returned_qty"])
        pending = _decimal(row["pending_qty"])
        total_returned += returned
        total_pending += pending
        normalized.append(
            {
                "id": row["id"],
                "dc_no": row["dc_no"],
                "dc_date": row["dc_date"],
                "customer_name": row["customer_name"],
                "item_code": row["item_code"],
                "item_name": row["item_name"],
                "qty": float(_decimal(row["qty"])),
                "returned_qty": float(returned),
                "pending_qty": float(pending),
            }
        )

    return normalized, {
        "rejection_lines": Decimal(str(len(normalized))),
        "returned_qty": total_returned,
        "pending_qty": total_pending,
    }


def _fetch_supplier_performance_rows():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                s.id,
                s.supplier_code,
                s.supplier_name,
                COUNT(DISTINCT pi.id) AS inward_count,
                COALESCE(SUM(pii.qty), 0) AS total_qty,
                COALESCE(SUM(pii.amount), 0) AS total_amount
            FROM suppliers s
            LEFT JOIN purchase_inward pi ON pi.supplier_id = s.id
            LEFT JOIN purchase_inward_items pii ON pii.inward_id = pi.id
            GROUP BY s.id, s.supplier_code, s.supplier_name
            ORDER BY total_amount DESC, s.supplier_name ASC
            """
        )
        rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()

    total_qty = Decimal("0")
    total_amount = Decimal("0")
    normalized = []

    for row in rows:
        qty = _decimal(row["total_qty"])
        amount = _decimal(row["total_amount"])
        total_qty += qty
        total_amount += amount
        normalized.append(
            {
                "id": row["id"],
                "supplier_code": row["supplier_code"],
                "supplier_name": row["supplier_name"],
                "inward_count": int(row["inward_count"] or 0),
                "total_qty": float(qty),
                "total_amount": float(amount),
            }
        )

    return normalized, {
        "supplier_count": Decimal(str(len(normalized))),
        "total_qty": total_qty,
        "total_amount": total_amount,
    }


def _fetch_customer_supplied_rows():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                sd.id,
                sd.dc_no,
                sd.dc_date,
                c.customer_code,
                c.customer_name,
                i.item_code,
                i.item_name,
                i.uom,
                sdi.qty,
                COALESCE(i.sales_rate, 0) AS sales_rate,
                COALESCE(i.sales_rate, 0) * COALESCE(sdi.qty, 0) AS amount,
                sd.status
            FROM sales_dc sd
            JOIN sales_dc_items sdi ON sdi.sales_dc_id = sd.id
            JOIN customers c ON c.id = sd.customer_id
            JOIN items i ON i.id = sdi.item_id
            ORDER BY sd.id DESC, sdi.id DESC
            """
        )
        rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()

    total_qty = Decimal("0")
    total_amount = Decimal("0")
    customer_names = set()
    normalized = []

    for row in rows:
        qty = _decimal(row["qty"])
        amount = _decimal(row["amount"])
        total_qty += qty
        total_amount += amount
        customer_names.add(row["customer_name"])
        normalized.append(
            {
                "id": row["id"],
                "dc_no": row["dc_no"],
                "dc_date": row["dc_date"],
                "customer_code": row["customer_code"] or "-",
                "customer_name": row["customer_name"],
                "item_code": row["item_code"],
                "item_name": row["item_name"],
                "uom": row["uom"] or "-",
                "qty": float(qty),
                "rate": float(_decimal(row["sales_rate"])),
                "amount": float(amount),
                "status": row["status"] or "-",
            }
        )

    return normalized, {
        "customer_count": Decimal(str(len(customer_names))),
        "total_qty": total_qty,
        "total_amount": total_amount,
        "supply_lines": Decimal(str(len(normalized))),
    }


REPORT_FETCHERS = {
    "inventory": _fetch_inventory_rows,
    "inward": _fetch_inward_rows,
    "lo-inward": _fetch_lo_inward_rows,
    "purchase": _fetch_purchase_rows,
    "manufacturing": _fetch_manufacturing_rows,
    "sales": _fetch_sales_rows,
    "dc-summary": _fetch_dc_summary_rows,
    "invoice": _fetch_invoice_rows,
    "rejection": _fetch_rejection_rows,
    "supplier-performance": _fetch_supplier_performance_rows,
    "customer-supplied": _fetch_customer_supplied_rows,
}


def _build_csv(rows):
    if not rows:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["No data"])
        output.seek(0)
        return output.getvalue()

    keys = list(rows[0].keys())
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([key.replace("_", " ").title() for key in keys])
    for row in rows:
        writer.writerow([row.get(key, "") for key in keys])
    output.seek(0)
    return output.getvalue()


@router.get("/")
def list_reports():
    return {"message": "Reports router ready"}


@router.get("/inventory")
def inventory_report():
    rows, summary = _fetch_inventory_rows()
    return {"summary": _to_float_dict(summary), "rows": rows}


@router.get("/inventory/csv")
def inventory_report_csv():
    rows, _summary = _fetch_inventory_rows()
    csv_content = _build_csv(rows)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="inventory-report.csv"'},
    )


@router.get("/{report_key}")
def business_report(report_key: str):
    fetcher = REPORT_FETCHERS.get(report_key)
    if fetcher is None:
        raise HTTPException(status_code=404, detail="Report not found")

    rows, summary = fetcher()
    return {"summary": _to_float_dict(summary), "rows": rows}


@router.get("/{report_key}/csv")
def business_report_csv(report_key: str):
    fetcher = REPORT_FETCHERS.get(report_key)
    if fetcher is None:
        raise HTTPException(status_code=404, detail="Report not found")

    rows, _summary = fetcher()
    csv_content = _build_csv(rows)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{report_key}-report.csv"'},
    )
