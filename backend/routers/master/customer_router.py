from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class CustomerPayload(BaseModel):
    customerCode: str
    customerName: str
    printName: Optional[str] = None
    customerGroup: Optional[str] = None
    customerType: Optional[str] = None
    territory: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = "Active"
    pricingGroup: Optional[str] = None
    taxInvoice: bool = True
    einvoice: bool = False
    ewaybill: bool = False
    active: bool = True
    address: Optional[str] = None
    deliveryAddress: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = "India"
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    fax: Optional[str] = None
    gstType: Optional[str] = None
    gstin: Optional[str] = None
    gstState: Optional[str] = None
    panNo: Optional[str] = None
    cinNo: Optional[str] = None
    msmeNo: Optional[str] = None
    msmeType: Optional[str] = None
    tdsApplicable: bool = False
    tcsApplicable: bool = False
    currency: Optional[str] = None
    paymentTerms: Optional[str] = None
    creditLimit: Optional[str] = None
    creditDays: Optional[str] = None
    discount: Optional[str] = None
    ledgerGroup: Optional[str] = None
    openingBalance: Optional[str] = None
    openingBalanceType: Optional[str] = "Dr"
    transportMode: Optional[str] = None
    transporter: Optional[str] = None
    deliveryTerms: Optional[str] = None
    leadDays: Optional[str] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


@router.get("/")
def list_customers():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT
                id,
                customer_code,
                customer_name,
                print_name,
                customer_group,
                customer_type,
                territory,
                industry,
                status,
                address,
                delivery_address,
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
                transport_mode,
                created_at
            FROM customers
            ORDER BY id DESC
            """
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/{customer_id}")
def get_customer(customer_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT * FROM customers WHERE id = %s", (customer_id,))
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Customer not found")
        return row
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def create_customer(payload: CustomerPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        cursor.execute(
            """
            INSERT INTO customers (
                customer_code, customer_name, print_name, customer_group,
                customer_type, territory, industry, status, pricing_group,
                tax_invoice, einvoice, ewaybill, is_active,
                address, delivery_address, city, state, pincode, country,
                phone, mobile, email, website, fax,
                gst_type, gstin, gst_state, pan_no, cin_no,
                msme_no, msme_type, tds_applicable, tcs_applicable,
                currency, payment_terms, credit_limit, credit_days, discount,
                ledger_group, opening_balance, opening_balance_type,
                transport_mode, transporter, delivery_terms, lead_days
            )
            VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,
                %s,%s,%s,%s
            )
            RETURNING id, customer_code, customer_name
            """,
            (
                data["customerCode"],
                data["customerName"],
                data["printName"],
                data["customerGroup"],
                data["customerType"],
                data["territory"],
                data["industry"],
                data["status"],
                data["pricingGroup"],
                data["taxInvoice"],
                data["einvoice"],
                data["ewaybill"],
                data["active"],
                data["address"],
                data["deliveryAddress"],
                data["city"],
                data["state"],
                data["pincode"],
                data["country"],
                data["phone"],
                data["mobile"],
                data["email"],
                data["website"],
                data["fax"],
                data["gstType"],
                data["gstin"],
                data["gstState"],
                data["panNo"],
                data["cinNo"],
                data["msmeNo"],
                data["msmeType"],
                data["tdsApplicable"],
                data["tcsApplicable"],
                data["currency"],
                data["paymentTerms"],
                data["creditLimit"] or None,
                data["creditDays"] or None,
                data["discount"] or None,
                data["ledgerGroup"],
                data["openingBalance"] or None,
                data["openingBalanceType"],
                data["transportMode"],
                data["transporter"],
                data["deliveryTerms"],
                data["leadDays"] or None,
            ),
        )
        created = cursor.fetchone()
        connection.commit()
        return {"message": "Customer created successfully", "customer": created}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
