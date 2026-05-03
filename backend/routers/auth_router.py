import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()

SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "change_me_to_a_long_random_secret")
ALGORITHM = "HS256"
DEFAULT_ADMIN_NAME = "Admin"
DEFAULT_ADMIN_EMAIL = "admin@arprecision.in"
DEFAULT_ADMIN_PHONE = "9999999999"
DEFAULT_ADMIN_PASSWORD = "AR@2026"


class RegisterPayload(BaseModel):
    full_name: str
    phone_number: str
    email: str
    password: str
    confirm_password: str


class LoginPayload(BaseModel):
    email: str
    password: str


def _ensure_company_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS company_info (
            id BIGSERIAL PRIMARY KEY,
            company_name VARCHAR(200) NOT NULL,
            print_name VARCHAR(200),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _ensure_users_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT REFERENCES company_info(id),
            full_name VARCHAR(150) NOT NULL,
            phone_number VARCHAR(15),
            email VARCHAR(200) NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            is_company_head BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES company_info(id)")
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(15)")
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'")
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_company_head BOOLEAN DEFAULT FALSE")
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")


def _ensure_company_row(cursor):
    _ensure_company_table(cursor)
    cursor.execute(
        """
        SELECT id, company_name, print_name
        FROM company_info
        ORDER BY id DESC
        LIMIT 1
        """
    )
    company = cursor.fetchone()
    if company:
        return company

    cursor.execute(
        """
        INSERT INTO company_info (company_name, print_name)
        VALUES ('AR Precision', 'AR Precision')
        RETURNING id, company_name, print_name
        """
    )
    return cursor.fetchone()


def _backfill_company_users(cursor, company_id: int):
    cursor.execute(
        """
        UPDATE users
        SET company_id = %s
        WHERE company_id IS NULL
        """,
        (company_id,),
    )


def _seed_default_admin(cursor, company_id: int):
    cursor.execute(
        """
        SELECT id
        FROM users
        WHERE company_id = %s
        ORDER BY id ASC
        LIMIT 1
        """,
        (company_id,),
    )
    existing_user = cursor.fetchone()
    if existing_user:
        return False

    password_hash = bcrypt.hashpw(DEFAULT_ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    cursor.execute(
        """
        INSERT INTO users (company_id, full_name, phone_number, email, password_hash, role, is_company_head, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (company_id, DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_PHONE, DEFAULT_ADMIN_EMAIL, password_hash, "admin", True, True),
    )
    return True


def _get_company_user_count(cursor, company_id: int):
    cursor.execute("SELECT COUNT(*) AS total FROM users WHERE company_id = %s", (company_id,))
    row = cursor.fetchone()
    return int(row["total"] or 0)


def _get_user_by_id(cursor, user_id: int):
    cursor.execute(
        """
        SELECT id, company_id, full_name, phone_number, email, role, is_company_head, is_active
        FROM users
        WHERE id = %s
        """,
        (user_id,),
    )
    return cursor.fetchone()


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _create_token(user_id: int, email: str):
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(authorization: str | None):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


@router.post("/register")
def register_user(payload: RegisterPayload):
    raise HTTPException(status_code=403, detail="Direct signup disabled. Login with admin and create users from Master > Users")


@router.post("/login")
def login_user(payload: LoginPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_users_table(cursor)
        company = _ensure_company_row(cursor)
        _backfill_company_users(cursor, company["id"])
        seeded = _seed_default_admin(cursor, company["id"])
        if seeded:
            connection.commit()
        cursor.execute(
            """
            SELECT id, company_id, full_name, phone_number, email, password_hash, role, is_company_head, is_active
            FROM users
            WHERE email = %s
            """,
            (payload.email,),
        )
        user = cursor.fetchone()
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user["is_active"]:
            raise HTTPException(status_code=403, detail="Account is inactive")

        if not bcrypt.checkpw(payload.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = _create_token(user["id"], user["email"])
        return {
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user["id"],
                "company_id": user["company_id"],
                "full_name": user["full_name"],
                "phone_number": user["phone_number"],
                "email": user["email"],
                "role": user["role"] or "user",
                "is_company_head": bool(user["is_company_head"]),
                "is_active": user["is_active"],
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/me")
def get_current_user(authorization: str | None = Header(default=None)):
    payload = _decode_token(authorization)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_users_table(cursor)
        company = _ensure_company_row(cursor)
        _backfill_company_users(cursor, company["id"])
        seeded = _seed_default_admin(cursor, company["id"])
        if seeded:
            connection.commit()
        user = _get_user_by_id(cursor, payload["user_id"])
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/users")
def list_company_users(authorization: str | None = Header(default=None)):
    payload = _decode_token(authorization)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_users_table(cursor)
        company = _ensure_company_row(cursor)
        _backfill_company_users(cursor, company["id"])
        seeded = _seed_default_admin(cursor, company["id"])
        if seeded:
            connection.commit()
        current_user = _get_user_by_id(cursor, payload["user_id"])
        if current_user is None:
            raise HTTPException(status_code=404, detail="User not found")

        cursor.execute(
            """
            SELECT id, company_id, full_name, phone_number, email, role, is_company_head, is_active, created_at
            FROM users
            WHERE company_id = %s
            ORDER BY id ASC
            """,
            (current_user["company_id"],),
        )
        users = cursor.fetchall()
        return {
            "users": users,
            "limit": 2,
            "count": len(users),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/users")
def create_company_user(payload: RegisterPayload, authorization: str | None = Header(default=None)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if len(payload.phone_number) != 10 or not payload.phone_number.isdigit():
        raise HTTPException(status_code=400, detail="Invalid phone number")

    token_payload = _decode_token(authorization)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_users_table(cursor)
        company = _ensure_company_row(cursor)
        _backfill_company_users(cursor, company["id"])
        seeded = _seed_default_admin(cursor, company["id"])
        if seeded:
            connection.commit()
        current_user = _get_user_by_id(cursor, token_payload["user_id"])
        if current_user is None:
            raise HTTPException(status_code=404, detail="User not found")
        if not current_user["is_company_head"] and (current_user["role"] or "").lower() != "admin":
            raise HTTPException(status_code=403, detail="Only company head can create users")

        company_user_count = _get_company_user_count(cursor, current_user["company_id"])
        if company_user_count >= 2:
            raise HTTPException(status_code=400, detail="Company user limit reached")

        password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        cursor.execute(
            """
            INSERT INTO users (company_id, full_name, phone_number, email, password_hash, role, is_company_head)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, company_id, full_name, phone_number, email, role, is_company_head, is_active, created_at
            """,
            (current_user["company_id"], payload.full_name, payload.phone_number, payload.email, password_hash, "user", False),
        )
        created_user = cursor.fetchone()
        connection.commit()
        return {
            "message": "Company user created successfully",
            "user": created_user,
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        error = str(exc).lower()
        if "users_email_key" in error or "users_phone_number_key" in error or "duplicate key" in error:
            raise HTTPException(status_code=400, detail="Email or phone number already exists") from exc
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
