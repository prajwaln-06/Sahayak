"""add_chat_messages_table

Revision ID: e3cd4f5a6b72
Revises: d2bc3e4f5a61
Create Date: 2026-05-09 02:33:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e3cd4f5a6b72'
down_revision: Union[str, Sequence[str], None] = 'd2bc3e4f5a61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    msg_type = postgresql.ENUM('TEXT', 'IMAGE', 'FILE', name='message_type_enum', create_type=True)
#     msg_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', msg_type, nullable=False, server_default='TEXT'),
        sa.Column('file_url', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )


def downgrade() -> None:
    op.drop_table('chat_messages')
    postgresql.ENUM(name='message_type_enum').drop(op.get_bind(), checkfirst=True)
