"""add_vector_embedding

Revision ID: c1ab2d3e4f50
Revises: b9fe7d8441a0
Create Date: 2026-05-09 02:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision: str = 'c1ab2d3e4f50'
down_revision: Union[str, Sequence[str], None] = 'b9fe7d8441a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure pgvector extension exists
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Add embedding column (768 dimensions for Gemini text-embedding-004)
    op.add_column('spaces', sa.Column('embedding', Vector(768), nullable=True))

    # Create IVFFlat index for fast cosine similarity search
    # NOTE: IVFFlat requires some data to exist first. For initial deployment,
    # create the index after inserting at least a few hundred rows.
    # For small datasets, use exact search (no index needed).
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_spaces_embedding
        ON spaces
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)


def downgrade() -> None:
    op.drop_index('ix_spaces_embedding', table_name='spaces')
    op.drop_column('spaces', 'embedding')
