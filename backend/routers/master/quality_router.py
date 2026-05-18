from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class InwardInspectionItemPayload(BaseModel):
    source_item_id: int
    item_id: int
    tolerance: Optional[str] = "0"
    received_qty: str
    rejected_qty: Optional[str] = "0"
    rework_qty: Optional[str] = "0"
    testing: Optional[str] = None
    location: Optional[str] = None
    batch_number: Optional[str] = None
    remark: Optional[str] = None
    attachment: Optional[str] = None


class InwardInspectionPayload(BaseModel):
    inspection_date: str
    inward_type: str
    purchase_inward_id: int
    company_name: str
    created_by: Optional[str] = None
    remarks: Optional[str] = None
    items: list[InwardInspectionItemPayload]


class ItemGroupPayload(BaseModel):
    groupName: str
    description: Optional[str] = None
    inspectionRequired: bool = False
    isActive: bool = True


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _decimal(value):
    return Decimal(str(value or 0))


def _ensure_quality_tables(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS item_groups (
            id BIGSERIAL PRIMARY KEY,
            group_name VARCHAR(150) NOT NULL UNIQUE,
            description TEXT,
            inspection_required BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS inward_inspections (
            id BIGSERIAL PRIMARY KEY,
            inspection_no VARCHAR(50) NOT NULL UNIQUE,
            inspection_date DATE NOT NULL,
            inward_type VARCHAR(30) NOT NULL,
            purchase_inward_id BIGINT NOT NULL REFERENCES purchase_inward(id),
            company_name VARCHAR(200) NOT NULL,
            inward_no VARCHAR(50) NOT NULL,
            inward_date DATE,
            invoice_no VARCHAR(100),
            created_by VARCHAR(150),
            remarks TEXT,
            status VARCHAR(50) DEFAULT 'Inspection Done',
            total_qty NUMERIC(14,2) DEFAULT 0,
            total_accepted_qty NUMERIC(14,2) DEFAULT 0,
            total_rejected_qty NUMERIC(14,2) DEFAULT 0,
            total_rework_qty NUMERIC(14,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS inward_inspection_items (
            id BIGSERIAL PRIMARY KEY,
            inspection_id BIGINT NOT NULL REFERENCES inward_inspections(id) ON DELETE CASCADE,
            purchase_inward_item_id BIGINT NOT NULL REFERENCES purchase_inward_items(id),
            item_id BIGINT NOT NULL REFERENCES items(id),
            tolerance NUMERIC(14,2) DEFAULT 0,
            uom VARCHAR(50),
            received_qty NUMERIC(14,2) DEFAULT 0,
            accepted_qty NUMERIC(14,2) DEFAULT 0,
            rejected_qty NUMERIC(14,2) DEFAULT 0,
            rework_qty NUMERIC(14,2) DEFAULT 0,
            testing VARCHAR(100),
            location VARCHAR(100),
            batch_number VARCHAR(100),
            remark TEXT,
            attachment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        ALTER TABLE stock_ledger
        ADD COLUMN IF NOT EXISTS ref_type VARCHAR(50)
        """
    )


def _next_inspection_no(cursor):
    _ensure_quality_tables(cursor)
    cursor.execute(
        """
        SELECT inspection_no
        FROM inward_inspections
        ORDER BY id DESC
        LIMIT 1
        """
    )
    row = cursor.fetchone()
    if not row or not row["inspection_no"]:
        return "INI-001"

    raw = str(row["inspection_no"])
    try:
        number = int(raw.split("-")[-1]) + 1
    except ValueError:
        number = 1
    return f"INI-{number:03d}"


def _fetch_source_headers(cursor, inward_type: str):
    cursor.execute(
        """
        SELECT
            pi.id,
            pi.inward_no,
            pi.inward_date,
            pi.invoice_no,
            pi.inward_type,
            COALESCE(s.supplier_name, c.customer_name, '-') AS company_name
        FROM purchase_inward pi
        LEFT JOIN suppliers s ON s.id = pi.supplier_id
        LEFT JOIN customers c ON c.id = pi.customer_id
        LEFT JOIN inward_inspections ii ON ii.purchase_inward_id = pi.id
        WHERE pi.inward_type = %s
          AND ii.id IS NULL
        ORDER BY pi.id DESC
        """,
        (inward_type.upper(),),
    )
    return cursor.fetchall()


def _fetch_source_detail(cursor, purchase_inward_id: int):
    cursor.execute(
        """
        SELECT
            pi.id,
            pi.inward_no,
            pi.inward_date,
            pi.invoice_no,
            pi.inward_type,
            COALESCE(s.supplier_name, c.customer_name, '-') AS company_name
        FROM purchase_inward pi
        LEFT JOIN suppliers s ON s.id = pi.supplier_id
        LEFT JOIN customers c ON c.id = pi.customer_id
        WHERE pi.id = %s
        """,
        (purchase_inward_id,),
    )
    header = cursor.fetchone()
    if header is None:
        raise HTTPException(status_code=404, detail="Inward source not found")

    cursor.execute(
        """
        SELECT
            pii.id AS source_item_id,
            pii.item_id,
            i.item_code,
            i.item_name,
            i.uom,
            pii.qty,
            pii.rate,
            pii.amount
        FROM purchase_inward_items pii
        JOIN items i ON i.id = pii.item_id
        WHERE pii.inward_id = %s
        ORDER BY pii.id ASC
        """,
        (purchase_inward_id,),
    )
    items = cursor.fetchall()
    return header, items


@router.get("/")
def list_quality_routes():
    return {"message": "Quality router ready"}


@router.get("/item-group")
def list_item_groups():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_quality_tables(cursor)
        connection.commit()
        cursor.execute(
            """
            SELECT id, group_name, description, inspection_required, is_active, created_at
            FROM item_groups
            ORDER BY id DESC
            """
        )
        return cursor.fetchall()
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/item-group")
def create_item_group(payload: ItemGroupPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()
    try:
        _ensure_quality_tables(cursor)
        cursor.execute(
            """
            INSERT INTO item_groups (group_name, description, inspection_required, is_active)
            VALUES (%s, %s, %s, %s)
            RETURNING id, group_name, description, inspection_required, is_active, created_at
            """,
            (
                data["groupName"],
                data["description"],
                data["inspectionRequired"],
                data["isActive"],
            ),
        )
        row = cursor.fetchone()
        connection.commit()
        return {"message": "Item group created successfully", "itemGroup": row}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.delete("/item-group/{item_group_id}")
def delete_item_group(item_group_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("DELETE FROM item_groups WHERE id = %s RETURNING id", (item_group_id,))
        deleted = cursor.fetchone()
        if deleted is None:
            raise HTTPException(status_code=404, detail="Item group not found")
        connection.commit()
        return {"message": "Item group deleted successfully", "id": item_group_id}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/inward-inspection/next-number")
def next_inward_inspection_number():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        return {"inspection_no": _next_inspection_no(cursor)}
    finally:
        cursor.close()
        connection.close()


@router.get("/inward-inspection/source")
def list_inward_inspection_sources(inward_type: str):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_quality_tables(cursor)
        rows = _fetch_source_headers(cursor, inward_type)
        return {"rows": rows}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/inward-inspection/source/{purchase_inward_id}")
def get_inward_inspection_source_detail(purchase_inward_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_quality_tables(cursor)
        header, items = _fetch_source_detail(cursor, purchase_inward_id)
        return {"header": header, "items": items}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/inward-inspection")
def list_inward_inspections():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_quality_tables(cursor)
        cursor.execute(
            """
            SELECT
                ii.id,
                ii.inspection_no,
                ii.inspection_date,
                ii.inward_type,
                ii.company_name,
                ii.inward_no,
                ii.status,
                ii.total_qty,
                ii.total_accepted_qty,
                ii.total_rejected_qty,
                ii.total_rework_qty,
                ii.created_by,
                ii.created_at
            FROM inward_inspections ii
            ORDER BY ii.id DESC
            """
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/inward-inspection/{inspection_id}")
def get_inward_inspection(inspection_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_quality_tables(cursor)
        cursor.execute(
            """
            SELECT
                ii.id,
                ii.inspection_no,
                ii.inspection_date,
                ii.inward_type,
                ii.purchase_inward_id,
                ii.company_name,
                ii.inward_no,
                ii.inward_date,
                ii.invoice_no,
                ii.created_by,
                ii.remarks,
                ii.status,
                ii.total_qty,
                ii.total_accepted_qty,
                ii.total_rejected_qty,
                ii.total_rework_qty,
                ii.created_at
            FROM inward_inspections ii
            WHERE ii.id = %s
            """,
            (inspection_id,),
        )
        header = cursor.fetchone()
        if header is None:
            raise HTTPException(status_code=404, detail="Inward inspection not found")

        cursor.execute(
            """
            SELECT
                iii.id,
                iii.purchase_inward_item_id AS source_item_id,
                iii.item_id,
                i.item_code,
                i.item_name,
                iii.tolerance,
                iii.uom,
                iii.received_qty,
                iii.accepted_qty,
                iii.rejected_qty,
                iii.rework_qty,
                iii.testing,
                iii.location,
                iii.batch_number,
                iii.remark,
                iii.attachment
            FROM inward_inspection_items iii
            JOIN items i ON i.id = iii.item_id
            WHERE iii.inspection_id = %s
            ORDER BY iii.id ASC
            """,
            (inspection_id,),
        )
        items = cursor.fetchall()
        return {"header": header, "items": items}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/inward-inspection")
def create_inward_inspection(payload: InwardInspectionPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_quality_tables(cursor)
        header, source_items = _fetch_source_detail(cursor, payload.purchase_inward_id)
        source_items_by_id = {row["source_item_id"]: row for row in source_items}

        cursor.execute(
            "SELECT id FROM inward_inspections WHERE purchase_inward_id = %s",
            (payload.purchase_inward_id,),
        )
        if cursor.fetchone() is not None:
            raise HTTPException(status_code=400, detail="Inspection already created for this inward number")

        if not payload.items:
            raise HTTPException(status_code=400, detail="At least one inspection item is required")

        inspection_no = _next_inspection_no(cursor)
        total_qty = Decimal("0")
        total_accepted_qty = Decimal("0")
        total_rejected_qty = Decimal("0")
        total_rework_qty = Decimal("0")
        normalized_items = []

        for row in payload.items:
            source = source_items_by_id.get(row.source_item_id)
            if source is None:
                raise HTTPException(status_code=400, detail="Invalid inward item selected")

            received_qty = _decimal(row.received_qty or source["qty"])
            rejected_qty = _decimal(row.rejected_qty)
            rework_qty = _decimal(row.rework_qty)
            tolerance = _decimal(row.tolerance)
            accepted_qty = received_qty - rejected_qty - rework_qty

            if accepted_qty < 0:
                raise HTTPException(status_code=400, detail="Accepted quantity cannot be negative")

            total_qty += received_qty
            total_accepted_qty += accepted_qty
            total_rejected_qty += rejected_qty
            total_rework_qty += rework_qty

            normalized_items.append(
                {
                    "source_item_id": row.source_item_id,
                    "item_id": row.item_id,
                    "uom": source["uom"] or "-",
                    "tolerance": tolerance,
                    "received_qty": received_qty,
                    "accepted_qty": accepted_qty,
                    "rejected_qty": rejected_qty,
                    "rework_qty": rework_qty,
                    "testing": row.testing or "QUALITY CHECK",
                    "location": row.location or "",
                    "batch_number": row.batch_number or "",
                    "remark": row.remark or "",
                    "attachment": row.attachment or "",
                }
            )

        cursor.execute(
            """
            INSERT INTO inward_inspections (
                inspection_no, inspection_date, inward_type, purchase_inward_id, company_name,
                inward_no, inward_date, invoice_no, created_by, remarks, status,
                total_qty, total_accepted_qty, total_rejected_qty, total_rework_qty
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, inspection_no
            """,
            (
                inspection_no,
                payload.inspection_date,
                payload.inward_type.upper(),
                payload.purchase_inward_id,
                payload.company_name,
                header["inward_no"],
                header["inward_date"],
                header["invoice_no"],
                payload.created_by,
                payload.remarks,
                "Inspection Done",
                total_qty,
                total_accepted_qty,
                total_rejected_qty,
                total_rework_qty,
            ),
        )
        created = cursor.fetchone()

        for row in normalized_items:
            cursor.execute(
                """
                INSERT INTO inward_inspection_items (
                    inspection_id, purchase_inward_item_id, item_id, tolerance, uom,
                    received_qty, accepted_qty, rejected_qty, rework_qty, testing,
                    location, batch_number, remark, attachment
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    created["id"],
                    row["source_item_id"],
                    row["item_id"],
                    row["tolerance"],
                    row["uom"],
                    row["received_qty"],
                    row["accepted_qty"],
                    row["rejected_qty"],
                    row["rework_qty"],
                    row["testing"],
                    row["location"],
                    row["batch_number"],
                    row["remark"],
                    row["attachment"],
                ),
            )

            if row["rejected_qty"] > 0:
                cursor.execute(
                    """
                    SELECT balance_qty
                    FROM stock_ledger
                    WHERE item_id = %s
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (row["item_id"],),
                )
                balance_row = cursor.fetchone()
                previous_balance = _decimal(balance_row["balance_qty"]) if balance_row else Decimal("0")
                new_balance = previous_balance - row["rejected_qty"]

                cursor.execute(
                    """
                    INSERT INTO stock_ledger (
                        item_id, ref_type, ref_id, inward_qty, outward_qty, balance_qty, remarks
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        row["item_id"],
                        "QUALITY_INWARD_REJECTION",
                        created["id"],
                        Decimal("0"),
                        row["rejected_qty"],
                        new_balance,
                        f"Rejected qty from {inspection_no}",
                    ),
                )

        connection.commit()
        return {
            "message": "Inward inspection saved successfully",
            "inspection": created,
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
