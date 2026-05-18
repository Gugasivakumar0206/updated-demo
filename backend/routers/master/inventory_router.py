from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import Json, RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class ItemPayload(BaseModel):
    itemType: Optional[str] = "Purchase Item"
    itemCode: str
    itemName: str
    printName: Optional[str] = None
    itemGroup: Optional[str] = None
    stockUOM: Optional[str] = None
    hsnCode: Optional[str] = None
    rack: Optional[str] = None
    bin: Optional[str] = None
    location: Optional[str] = None
    minStock: Optional[str] = None
    maxStock: Optional[str] = None
    reorderLevel: Optional[str] = None
    purchaseRate: Optional[str] = None
    sellingRate: Optional[str] = None
    gstPercent: Optional[str] = None
    status: Optional[str] = "Active"
    engineeringDocumentName: Optional[str] = None
    engineeringDocumentData: Optional[str] = None
    formData: Optional[dict[str, Any]] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _ensure_item_type_column(cursor):
    cursor.execute(
        """
        ALTER TABLE items
        ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'Purchase Item'
        """
    )
    cursor.execute(
        """
        ALTER TABLE items
        ADD COLUMN IF NOT EXISTS engineering_document_name VARCHAR(255)
        """
    )
    cursor.execute(
        """
        ALTER TABLE items
        ADD COLUMN IF NOT EXISTS engineering_document_data TEXT
        """
    )
    cursor.execute(
        """
        ALTER TABLE items
        ADD COLUMN IF NOT EXISTS form_data JSONB
        """
    )


@router.get("/next-number")
def get_next_item_number(item_type: Optional[str] = None):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    prefix_map = {
        "Purchase Item": "PIT",
        "Customer Supplied": "CSI",
        "Manufacturing": "MFG",
        "Manufacturing Item": "MFG",
    }
    prefix = prefix_map.get(item_type or "", "ITM")

    try:
        _ensure_item_type_column(cursor)
        cursor.execute(
            """
            SELECT item_code
            FROM items
            WHERE item_code LIKE %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (f"{prefix}-%",),
        )
        row = cursor.fetchone()
        current = row["item_code"] if row else ""
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
def list_items(item_type: Optional[str] = None):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_item_type_column(cursor)
        cursor.execute(
            """
            SELECT
                id,
                item_type,
                item_code,
                item_name,
                print_name,
                item_group,
                uom,
                hsn_code,
                rack,
                bin,
                min_stock,
                max_stock,
                reorder_level,
                purchase_rate,
                sales_rate,
                gst_percent,
                engineering_document_name,
                form_data,
                status,
                created_at
            FROM items
            WHERE (%s IS NULL OR item_type = %s)
            ORDER BY id DESC
            """,
            (item_type, item_type),
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/{item_id}")
def get_item(item_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_item_type_column(cursor)
        cursor.execute("SELECT * FROM items WHERE id = %s", (item_id,))
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Item not found")
        return row
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def create_item(payload: ItemPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_item_type_column(cursor)
        cursor.execute(
            """
            INSERT INTO items (
                item_type, item_code, item_name, print_name, item_group, uom, hsn_code,
                rack, bin, min_stock, max_stock, reorder_level,
                purchase_rate, sales_rate, gst_percent, engineering_document_name, engineering_document_data, status
            )
            VALUES (
                %s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s
            )
            RETURNING id, item_type, item_code, item_name
            """,
            (
                data["itemType"] or "Purchase Item",
                data["itemCode"],
                data["itemName"],
                data["printName"],
                data["itemGroup"],
                data["stockUOM"],
                data["hsnCode"],
                data["rack"],
                data["bin"],
                data["minStock"] or None,
                data["maxStock"] or None,
                data["reorderLevel"] or None,
                data["purchaseRate"] or None,
                data["sellingRate"] or None,
                data["gstPercent"] or None,
                data["engineeringDocumentName"],
                data["engineeringDocumentData"],
                data["status"],
            ),
        )
        created = cursor.fetchone()
        cursor.execute(
            """
            UPDATE items
            SET form_data = %s
            WHERE id = %s
            """,
            (Json(data.get("formData") or data), created["id"]),
        )
        connection.commit()
        return {"message": "Item created successfully", "item": created}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.put("/{item_id}")
def update_item(item_id: int, payload: ItemPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_item_type_column(cursor)
        cursor.execute("SELECT id FROM items WHERE id = %s", (item_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Item not found")

        cursor.execute(
            """
            UPDATE items
            SET
                item_type = %s,
                item_code = %s,
                item_name = %s,
                print_name = %s,
                item_group = %s,
                uom = %s,
                hsn_code = %s,
                rack = %s,
                bin = %s,
                min_stock = %s,
                max_stock = %s,
                reorder_level = %s,
                purchase_rate = %s,
                sales_rate = %s,
                gst_percent = %s,
                engineering_document_name = %s,
                engineering_document_data = %s,
                form_data = %s,
                status = %s
            WHERE id = %s
            RETURNING id, item_type, item_code, item_name
            """,
            (
                data["itemType"] or "Purchase Item",
                data["itemCode"],
                data["itemName"],
                data["printName"],
                data["itemGroup"],
                data["stockUOM"],
                data["hsnCode"],
                data["rack"],
                data["bin"],
                data["minStock"] or None,
                data["maxStock"] or None,
                data["reorderLevel"] or None,
                data["purchaseRate"] or None,
                data["sellingRate"] or None,
                data["gstPercent"] or None,
                data["engineeringDocumentName"],
                data["engineeringDocumentData"],
                Json(data.get("formData") or data),
                data["status"],
                item_id,
            ),
        )
        updated = cursor.fetchone()
        connection.commit()
        return {"message": "Item updated successfully", "item": updated}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.delete("/{item_id}")
def delete_item(item_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT id, item_code, item_name FROM items WHERE id = %s", (item_id,))
        item = cursor.fetchone()
        if item is None:
            raise HTTPException(status_code=404, detail="Item not found")
        cursor.execute("DELETE FROM items WHERE id = %s", (item_id,))
        connection.commit()
        return {"message": "Item deleted successfully", "item": item}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
