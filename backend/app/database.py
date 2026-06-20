import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Attempt to connect to PostgreSQL. If it fails, fall back to SQLite.
# This makes local testing out-of-the-box seamless, even if Postgres is not configured yet.
engine = None
try:
    # Build standard engine with connection pool
    pg_engine = create_engine(
        settings.DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True
    )
    # Test connection
    with pg_engine.connect() as conn:
        pass
    engine = pg_engine
    print("Database: Connected to PostgreSQL successfully.")
except Exception as e:
    print(f"Database: PostgreSQL connection failed ({e}).")
    print("Database: Falling back to local SQLite database 'sarees.db' for development.")
    
    # Fallback to local SQLite file
    sqlite_url = "sqlite:///./sarees.db"
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}  # Required for SQLite in multithreaded environments
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
