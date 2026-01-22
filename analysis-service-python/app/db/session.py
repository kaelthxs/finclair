from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import Generator


DATABASE_URL = "postgresql+psycopg2://postgresql:postgresql@localhost:5434/finclair_analysis"

engine = create_engine(
    DATABASE_URL,
    echo=True,
    future=True
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()