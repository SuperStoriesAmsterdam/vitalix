"""Sprint 1 — insights + insight_folders

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-05 00:00:00.000000

Voegt toe:
  - insight_folders tabel (persoonlijke mappenstructuur voor Claude Q&A)
  - insights tabel (opgeslagen vragen + antwoorden + AI-inzichten)

Idempotent: veilig om meerdere keren uit te voeren via IF NOT EXISTS.
"""
from alembic import op

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # insight_folders
    op.execute("""
        CREATE TABLE IF NOT EXISTS insight_folders (
            id SERIAL NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id),
            name VARCHAR NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE,
            PRIMARY KEY (id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_insight_folders_id ON insight_folders(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_insight_folders_user_id ON insight_folders(user_id)")

    # insights
    op.execute("""
        CREATE TABLE IF NOT EXISTS insights (
            id SERIAL NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id),
            created_at TIMESTAMP WITHOUT TIME ZONE,
            insight_type VARCHAR NOT NULL,
            question TEXT,
            content TEXT NOT NULL,
            thinking TEXT,
            marker_names JSONB,
            is_read BOOLEAN,
            title VARCHAR,
            folder_id INTEGER REFERENCES insight_folders(id),
            PRIMARY KEY (id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_insights_id ON insights(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_insights_user_id ON insights(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_insights_created_at ON insights(created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_insights_folder_id ON insights(folder_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS insights")
    op.execute("DROP TABLE IF EXISTS insight_folders")
