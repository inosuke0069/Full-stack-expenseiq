"""
Database configuration using SQLAlchemy + PostgreSQL

FIX BUG 2: Now uses DATABASE_URL directly from .env instead of
           rebuilding it from individual DB_* fields (which ignored .env's DATABASE_URL).
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# BUG 2 FIX: Use DATABASE_URL directly — this is what .env defines
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
