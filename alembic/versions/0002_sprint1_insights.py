"""Sprint 1 — insights + insight_folders

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-05 00:00:00.000000

Voegt toe:
  - insight_folders tabel (persoonlijke mappenstructuur voor Claude Q&A)
  - insights tabel (opgeslagen vragen + antwoorden + AI-inzichten)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'insight_folders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_insight_folders_id', 'insight_folders', ['id'])
    op.create_index('ix_insight_folders_user_id', 'insight_folders', ['user_id'])

    op.create_table(
        'insights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('insight_type', sa.String(), nullable=False),
        sa.Column('question', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('thinking', sa.Text(), nullable=True),
        sa.Column('marker_names', JSONB(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('folder_id', sa.Integer(), sa.ForeignKey('insight_folders.id'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_insights_id', 'insights', ['id'])
    op.create_index('ix_insights_user_id', 'insights', ['user_id'])
    op.create_index('ix_insights_created_at', 'insights', ['created_at'])
    op.create_index('ix_insights_folder_id', 'insights', ['folder_id'])


def downgrade() -> None:
    op.drop_table('insights')
    op.drop_table('insight_folders')
