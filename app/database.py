"""
Vitalix — database verbinding
SQLAlchemy engine, sessie en Base voor alle modellen.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

engine = create_engine(settings.database_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency die een database-sessie levert en altijd netjes sluit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
