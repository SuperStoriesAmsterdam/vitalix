"""
Vitalix — Sprint 1 database migratie
Voegt kolommen en tabellen toe die in Sprint 1 zijn toegevoegd aan models.py
maar nog niet bestaan in de productiedatabase.

Voer uit met: python scripts/migrate_sprint1.py

Veilig om meerdere keren uit te voeren — elke stap checkt of de aanpassing
al bestaat voordat hij iets doet.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.database_url)

MIGRATIONS = [
    # health_profile kolom op users (Sprint 1.1)
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS health_profile JSONB;
    """,

    # insight_folders tabel (Sprint 1.2)
    """
    CREATE TABLE IF NOT EXISTS insight_folders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS ix_insight_folders_user_id
    ON insight_folders(user_id);
    """,

    # insights tabel aanmaken als die nog niet bestaat (Sprint 1.2)
    """
    CREATE TABLE IF NOT EXISTS insights (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        insight_type VARCHAR NOT NULL,
        question TEXT,
        content TEXT NOT NULL,
        thinking TEXT,
        marker_names JSONB,
        is_read BOOLEAN DEFAULT FALSE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS ix_insights_user_id ON insights(user_id);
    """,
    """
    CREATE INDEX IF NOT EXISTS ix_insights_created_at ON insights(created_at);
    """,

    # title en folder_id toevoegen aan insights (Sprint 1.2+)
    """
    ALTER TABLE insights
    ADD COLUMN IF NOT EXISTS title VARCHAR;
    """,
    """
    ALTER TABLE insights
    ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES insight_folders(id);
    """,
    """
    CREATE INDEX IF NOT EXISTS ix_insights_folder_id
    ON insights(folder_id);
    """,
]


def run():
    print("Vitalix Sprint 1 migratie starten...")
    with engine.connect() as conn:
        for i, sql in enumerate(MIGRATIONS, 1):
            sql = sql.strip()
            if not sql:
                continue
            try:
                conn.execute(text(sql))
                conn.commit()
                first_line = sql.split('\n')[0][:60]
                print(f"  ✓ Stap {i}: {first_line}")
            except Exception as e:
                print(f"  ✗ Stap {i} mislukt: {e}")
                conn.rollback()
                raise
    print("Migratie voltooid.")


if __name__ == "__main__":
    run()
