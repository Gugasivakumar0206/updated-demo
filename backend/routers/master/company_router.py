from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class CompanyInfoPayload(BaseModel):
    companyName: str
    printName: Optional[str] = None
    address: Optional[str] = None
    deliveryAddress: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    pinNo: Optional[str] = None
    mobileNo: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    contactPerson: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    companyDisplayType: Optional[str] = None
    msmeNo: Optional[str] = None
    tanNo: Optional[str] = None
    panItNo: Optional[str] = None
    pfNo: Optional[str] = None
    esiNo: Optional[str] = None
    importExportCode: Optional[str] = None
    cin: Optional[str] = None
    gstin: Optional[str] = None
    gstState: Optional[str] = None
    gstinUser: Optional[str] = None
    eInvoiceUser: Optional[str] = None
    eInvoicePassword: Optional[str] = None
    ewaybillUser: Optional[str] = None
    ewaybillPassword: Optional[str] = None
    apiKey: Optional[str] = None
    accessToken: Optional[str] = None
    companyLogo: Optional[str] = None
    isoLogo: Optional[str] = None
    bisLogo: Optional[str] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _ensure_company_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS company_info (
            id BIGSERIAL PRIMARY KEY,
            company_name VARCHAR(200) NOT NULL,
            print_name VARCHAR(200),
            address TEXT,
            delivery_address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            pincode VARCHAR(20),
            pin_no VARCHAR(50),
            mobile_no VARCHAR(30),
            email VARCHAR(150),
            website VARCHAR(200),
            contact_person VARCHAR(150),
            latitude VARCHAR(50),
            longitude VARCHAR(50),
            company_display_type VARCHAR(100),
            msme_no VARCHAR(100),
            tan_no VARCHAR(50),
            pan_it_no VARCHAR(50),
            pf_no VARCHAR(50),
            esi_no VARCHAR(50),
            import_export_code VARCHAR(50),
            cin VARCHAR(100),
            gstin VARCHAR(50),
            gst_state VARCHAR(100),
            gstin_user VARCHAR(100),
            einvoice_user VARCHAR(100),
            einvoice_password TEXT,
            ewaybill_user VARCHAR(100),
            ewaybill_password TEXT,
            api_key TEXT,
            access_token TEXT,
            company_logo TEXT,
            iso_logo TEXT,
            bis_logo TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


@router.get("/")
def get_company_info():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_company_table(cursor)
        connection.commit()
        cursor.execute(
            """
            SELECT
                id,
                company_name,
                print_name,
                address,
                delivery_address,
                city,
                state,
                pincode,
                pin_no,
                mobile_no,
                email,
                website,
                contact_person,
                latitude,
                longitude,
                company_display_type,
                msme_no,
                tan_no,
                pan_it_no,
                pf_no,
                esi_no,
                import_export_code,
                cin,
                gstin,
                gst_state,
                gstin_user,
                einvoice_user,
                einvoice_password,
                ewaybill_user,
                ewaybill_password,
                api_key,
                access_token,
                company_logo,
                iso_logo,
                bis_logo,
                created_at,
                updated_at
            FROM company_info
            ORDER BY id DESC
            LIMIT 1
            """
        )
        company = cursor.fetchone()
        return {"company": company}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def save_company_info(payload: CompanyInfoPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_company_table(cursor)
        cursor.execute("SELECT id FROM company_info ORDER BY id DESC LIMIT 1")
        existing = cursor.fetchone()

        params = (
            data["companyName"],
            data["printName"],
            data["address"],
            data["deliveryAddress"],
            data["city"],
            data["state"],
            data["pincode"],
            data["pinNo"],
            data["mobileNo"],
            data["email"],
            data["website"],
            data["contactPerson"],
            data["latitude"],
            data["longitude"],
            data["companyDisplayType"],
            data["msmeNo"],
            data["tanNo"],
            data["panItNo"],
            data["pfNo"],
            data["esiNo"],
            data["importExportCode"],
            data["cin"],
            data["gstin"],
            data["gstState"],
            data["gstinUser"],
            data["eInvoiceUser"],
            data["eInvoicePassword"],
            data["ewaybillUser"],
            data["ewaybillPassword"],
            data["apiKey"],
            data["accessToken"],
            data["companyLogo"],
            data["isoLogo"],
            data["bisLogo"],
        )

        if existing:
            cursor.execute(
                """
                UPDATE company_info
                SET
                    company_name = %s,
                    print_name = %s,
                    address = %s,
                    delivery_address = %s,
                    city = %s,
                    state = %s,
                    pincode = %s,
                    pin_no = %s,
                    mobile_no = %s,
                    email = %s,
                    website = %s,
                    contact_person = %s,
                    latitude = %s,
                    longitude = %s,
                    company_display_type = %s,
                    msme_no = %s,
                    tan_no = %s,
                    pan_it_no = %s,
                    pf_no = %s,
                    esi_no = %s,
                    import_export_code = %s,
                    cin = %s,
                    gstin = %s,
                    gst_state = %s,
                    gstin_user = %s,
                    einvoice_user = %s,
                    einvoice_password = %s,
                    ewaybill_user = %s,
                    ewaybill_password = %s,
                    api_key = %s,
                    access_token = %s,
                    company_logo = %s,
                    iso_logo = %s,
                    bis_logo = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                params + (existing["id"],),
            )
        else:
            cursor.execute(
                """
                INSERT INTO company_info (
                    company_name,
                    print_name,
                    address,
                    delivery_address,
                    city,
                    state,
                    pincode,
                    pin_no,
                    mobile_no,
                    email,
                    website,
                    contact_person,
                    latitude,
                    longitude,
                    company_display_type,
                    msme_no,
                    tan_no,
                    pan_it_no,
                    pf_no,
                    esi_no,
                    import_export_code,
                    cin,
                    gstin,
                    gst_state,
                    gstin_user,
                    einvoice_user,
                    einvoice_password,
                    ewaybill_user,
                    ewaybill_password,
                    api_key,
                    access_token,
                    company_logo,
                    iso_logo,
                    bis_logo
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING *
                """,
                params,
            )

        company = cursor.fetchone()
        connection.commit()
        return {"message": "Company info saved successfully", "company": company}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
