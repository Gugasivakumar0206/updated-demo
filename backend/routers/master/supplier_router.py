from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import Json, RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class SupplierPayload(BaseModel):
    supplierCode: str
    supplierName: str
    printName: Optional[str] = None
    supplierGroup: Optional[str] = None
    supplierType: Optional[str] = None
    territory: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = "Active"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = "India"
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    gstType: Optional[str] = None
    gstin: Optional[str] = None
    gstState: Optional[str] = None
    panNo: Optional[str] = None
    msmeNo: Optional[str] = None
    cinNo: Optional[str] = None
    msmeType: Optional[str] = None
    deliveryAddress: Optional[str] = None
    fax: Optional[str] = None
    paymentTerms: Optional[str] = None
    creditDays: Optional[str] = None
    tdsApplicable: Optional[bool] = False
    currency: Optional[str] = None
    creditLimit: Optional[str] = None
    openingBalance: Optional[str] = None
    openingBalanceType: Optional[str] = "Cr"
    ledgerGroup: Optional[str] = None
    discount: Optional[str] = None
    purchaseOrderType: Optional[str] = None
    minOrderQty: Optional[str] = None
    minOrderValue: Optional[str] = None
    deliveryTerms: Optional[str] = None
    transportMode: Optional[str] = None
    transporter: Optional[str] = None
    qualityRequired: Optional[bool] = False
    inspectionRequired: Optional[bool] = False
    active: Optional[bool] = True
    contacts: Optional[List[dict[str, Any]]] = None
    banks: Optional[List[dict[str, Any]]] = None
    items: Optional[List[dict[str, Any]]] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _ensure_supplier_extra_columns(cursor):
    cursor.execute("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contacts JSONB")
    cursor.execute("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS banks JSONB")
    cursor.execute("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS items_supplied JSONB")
    cursor.execute("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS form_data JSONB")


@router.get("/next-number")
def get_next_supplier_number():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT supplier_code FROM suppliers WHERE supplier_code LIKE 'SUP-%' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        current = row["supplier_code"] if row else ""
        try:
            next_number = int(str(current).split("-")[-1]) + 1
        except ValueError:
            next_number = 1
        return {"nextNumber": f"SUP-{next_number:04d}"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/")
def list_suppliers():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_supplier_extra_columns(cursor)
        cursor.execute(
            """
            SELECT
                id,
                supplier_code,
                supplier_name,
                print_name,
                supplier_group,
                supplier_type,
                territory,
                industry,
                status,
                address,
                city,
                state,
                pincode,
                phone,
                mobile,
                email,
                gstin,
                gst_state,
                pan_no,
                payment_terms,
                contacts,
                banks,
                items_supplied,
                form_data,
                created_at
            FROM suppliers
            ORDER BY id DESC
            """
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def create_supplier(payload: SupplierPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_supplier_extra_columns(cursor)
        if not str(data["gstin"] or "").strip():
            raise HTTPException(status_code=400, detail="GSTIN is mandatory")

        cursor.execute(
            """
            INSERT INTO suppliers (
                supplier_code, supplier_name, print_name, supplier_group,
                supplier_type, territory, industry, status,
                address, city, state, pincode, country,
                phone, mobile, email, website,
                gst_type, gstin, gst_state, pan_no, msme_no,
                payment_terms, credit_days
            )
            VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s
            )
            RETURNING id, supplier_code, supplier_name
            """,
            (
                data["supplierCode"],
                data["supplierName"],
                data["printName"],
                data["supplierGroup"],
                data["supplierType"],
                data["territory"],
                data["industry"],
                data["status"],
                data["address"],
                data["city"],
                data["state"],
                data["pincode"],
                data["country"],
                data["phone"],
                data["mobile"],
                data["email"],
                data["website"],
                data["gstType"],
                data["gstin"],
                data["gstState"],
                data["panNo"],
                data["msmeNo"],
                data["paymentTerms"],
                data["creditDays"] or None,
            ),
        )
        created = cursor.fetchone()
        cursor.execute(
            """
            UPDATE suppliers
            SET contacts = %s, banks = %s, items_supplied = %s, form_data = %s
            WHERE id = %s
            """,
            (
                Json(data.get("contacts") or []),
                Json(data.get("banks") or []),
                Json(data.get("items") or []),
                Json(data),
                created["id"],
            ),
        )
        connection.commit()
        return {"message": "Supplier created successfully", "supplier": created}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/{supplier_id}")
def get_supplier(supplier_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_supplier_extra_columns(cursor)
        cursor.execute("SELECT * FROM suppliers WHERE id = %s", (supplier_id,))
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Supplier not found")
        return row
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.put("/{supplier_id}")
def update_supplier(supplier_id: int, payload: SupplierPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_supplier_extra_columns(cursor)
        if not str(data["gstin"] or "").strip():
            raise HTTPException(status_code=400, detail="GSTIN is mandatory")

        cursor.execute(
            """
            UPDATE suppliers
            SET
                supplier_code = %s,
                supplier_name = %s,
                print_name = %s,
                supplier_group = %s,
                supplier_type = %s,
                territory = %s,
                industry = %s,
                status = %s,
                address = %s,
                city = %s,
                state = %s,
                pincode = %s,
                country = %s,
                phone = %s,
                mobile = %s,
                email = %s,
                website = %s,
                gst_type = %s,
                gstin = %s,
                gst_state = %s,
                pan_no = %s,
                msme_no = %s,
                payment_terms = %s,
                credit_days = %s,
                contacts = %s,
                banks = %s,
                items_supplied = %s,
                form_data = %s
            WHERE id = %s
            RETURNING id, supplier_code, supplier_name
            """,
            (
                data["supplierCode"],
                data["supplierName"],
                data["printName"],
                data["supplierGroup"],
                data["supplierType"],
                data["territory"],
                data["industry"],
                data["status"],
                data["address"],
                data["city"],
                data["state"],
                data["pincode"],
                data["country"],
                data["phone"],
                data["mobile"],
                data["email"],
                data["website"],
                data["gstType"],
                data["gstin"],
                data["gstState"],
                data["panNo"],
                data["msmeNo"],
                data["paymentTerms"],
                data["creditDays"] or None,
                Json(data.get("contacts") or []),
                Json(data.get("banks") or []),
                Json(data.get("items") or []),
                Json(data),
                supplier_id,
            ),
        )
        updated = cursor.fetchone()
        if updated is None:
            raise HTTPException(status_code=404, detail="Supplier not found")
        connection.commit()
        return {"message": "Supplier updated successfully", "supplier": updated}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("DELETE FROM suppliers WHERE id = %s RETURNING id", (supplier_id,))
        deleted = cursor.fetchone()
        if deleted is None:
            raise HTTPException(status_code=404, detail="Supplier not found")
        connection.commit()
        return {"message": "Supplier deleted successfully", "id": supplier_id}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
