import os
from pathlib import Path

import psycopg2
from psycopg2 import OperationalError
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

def get_connection():
    try:
        connection = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "password"),
            dbname=os.getenv("DB_NAME", "ar_precision_erp"),
            port=int(os.getenv("DB_PORT", "5432")),
            connect_timeout=5,
        )

        print("PostgreSQL Database Connected")
        return connection

    except OperationalError as e:
        print("Error while connecting to PostgreSQL", e)
        return None
