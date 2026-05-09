"""add_spaces_availability_kyc_tables

Revision ID: b9fe7d8441a0
Revises: a8ed5c6335f9
Create Date: 2026-05-09 01:57:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b9fe7d8441a0'
down_revision: Union[str, Sequence[str], None] = 'a8ed5c6335f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────
    space_type_enum = postgresql.ENUM(
        'CONFERENCE_ROOM', 'STUDIO', 'ROOFTOP', 'GARDEN',
        'GALLERY', 'RESTAURANT', 'WAREHOUSE', 'OTHER',
        name='space_type_enum', create_type=True,
    )
#     space_type_enum.create(op.get_bind(), checkfirst=True)

    doc_type_enum = postgresql.ENUM(
        'AADHAAR', 'PASSPORT', 'PAN',
        name='doc_type_enum', create_type=True,
    )
#     doc_type_enum.create(op.get_bind(), checkfirst=True)

    kyc_doc_status_enum = postgresql.ENUM(
        'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED',
        name='kyc_doc_status_enum', create_type=True,
    )
#     kyc_doc_status_enum.create(op.get_bind(), checkfirst=True)

    # ── Spaces table ──────────────────────────────────────────
    op.create_table(
        'spaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('host_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('space_type', space_type_enum, nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('city', sa.String(100), nullable=False, index=True),
        sa.Column('neighbourhood', sa.String(100), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lng', sa.Float(), nullable=True),
        sa.Column('capacity_standing', sa.Integer(), nullable=True),
        sa.Column('capacity_seated', sa.Integer(), nullable=True),
        sa.Column('amenities', postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('rules', postgresql.JSONB(), nullable=True),
        sa.Column('base_price_hourly', sa.Float(), nullable=False),
        sa.Column('base_price_daily', sa.Float(), nullable=True),
        sa.Column('weekend_multiplier', sa.Float(), nullable=False, server_default=sa.text('1.3')),
        sa.Column('surge_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('surge_multiplier', sa.Float(), nullable=False, server_default=sa.text('1.5')),
        sa.Column('min_booking_hours', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('instant_book', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_3d_generated', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('thumbnail_url', sa.Text(), nullable=True),
        sa.Column('photo_urls', postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('mesh_url', sa.Text(), nullable=True),
        sa.Column('rating_avg', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('review_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # ── Availability blocks ───────────────────────────────────
    op.create_table(
        'availability_blocks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('space_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('spaces.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('blocked_date', sa.Date(), nullable=False),
        sa.Column('reason', sa.String(255), nullable=True),
    )

    # ── KYC Documents ─────────────────────────────────────────
    op.create_table(
        'kyc_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('doc_type', doc_type_enum, nullable=False),
        sa.Column('front_url', sa.Text(), nullable=False),
        sa.Column('back_url', sa.Text(), nullable=True),
        sa.Column('extracted_name', sa.String(255), nullable=True),
        sa.Column('extracted_dob', sa.String(50), nullable=True),
        sa.Column('extracted_id_number', sa.String(100), nullable=True),
        sa.Column('ocr_confidence', sa.Float(), nullable=True),
        sa.Column('status', kyc_doc_status_enum, nullable=False, server_default='PENDING'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )


def downgrade() -> None:
    op.drop_table('kyc_documents')
    op.drop_table('availability_blocks')
    op.drop_table('spaces')

    for name in ('kyc_doc_status_enum', 'doc_type_enum', 'space_type_enum'):
        postgresql.ENUM(name=name).drop(op.get_bind(), checkfirst=True)
