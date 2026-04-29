from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

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
    paymentTerms: Optional[str] = None
    creditDays: Optional[str] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


@router.get("/")
def list_suppliers():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
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
        connection.commit()
        return {"message": "Supplier created successfully", "supplier": created}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
