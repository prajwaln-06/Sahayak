"""add_bookings_vendors_tables

Revision ID: d2bc3e4f5a61
Revises: c1ab2d3e4f50
Create Date: 2026-05-09 02:24:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd2bc3e4f5a61'
down_revision: Union[str, Sequence[str], None] = 'c1ab2d3e4f50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────
    booking_status = postgresql.ENUM('DRAFT', 'CONFIRMED', 'CANCELLED', name='booking_status_enum', create_type=True)
#     booking_status.create(op.get_bind(), checkfirst=True)

    vendor_type = postgresql.ENUM('CATERING', 'AV_TECH', 'SECURITY', 'DECOR', 'PHOTOGRAPHY', 'CLEANING', 'OTHER', name='vendor_type_enum', create_type=True)
#     vendor_type.create(op.get_bind(), checkfirst=True)

    price_unit = postgresql.ENUM('PER_PERSON', 'FIXED', 'HOURLY', name='price_unit_enum', create_type=True)
#     price_unit.create(op.get_bind(), checkfirst=True)

    rfq_status = postgresql.ENUM('SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'COUNTERED', name='rfq_status_enum', create_type=True)
#     rfq_status.create(op.get_bind(), checkfirst=True)

    # ── Bookings ──────────────────────────────────────────────
    op.create_table(
        'bookings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('renter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('space_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('spaces.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('start_datetime', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_datetime', sa.DateTime(timezone=True), nullable=False),
        sa.Column('capacity_requested', sa.Integer(), nullable=True),
        sa.Column('event_name', sa.String(255), nullable=True),
        sa.Column('event_description', sa.Text(), nullable=True),
        sa.Column('special_requirements', sa.Text(), nullable=True),
        sa.Column('status', booking_status, nullable=False, server_default='CONFIRMED'),
        sa.Column('base_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('platform_fee', sa.Numeric(12, 2), nullable=False),
        sa.Column('gst_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # ── Vendors ───────────────────────────────────────────────
    op.create_table(
        'vendors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True),
        sa.Column('business_name', sa.String(255), nullable=False),
        sa.Column('vendor_type', vendor_type, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('service_cities', postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('min_price', sa.Float(), nullable=True),
        sa.Column('max_price', sa.Float(), nullable=True),
        sa.Column('price_unit', price_unit, nullable=False, server_default='FIXED'),
        sa.Column('rating_avg', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('review_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('portfolio_urls', postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # ── Vendor Services ───────────────────────────────────────
    op.create_table(
        'vendor_services',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('vendor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('vendors.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('service_name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Float(), nullable=True),
        sa.Column('unit', sa.String(50), nullable=True),
        sa.Column('photo_url', sa.Text(), nullable=True),
    )

    # ── Gig Requests (RFQs) ───────────────────────────────────
    op.create_table(
        'gig_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('booking_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('vendor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('vendors.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('renter_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('status', rfq_status, nullable=False, server_default='SENT'),
        sa.Column('vendor_quoted_price', sa.Numeric(12, 2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )


def downgrade() -> None:
    op.drop_table('gig_requests')
    op.drop_table('vendor_services')
    op.drop_table('vendors')
    op.drop_table('bookings')

    for name in ('rfq_status_enum', 'price_unit_enum', 'vendor_type_enum', 'booking_status_enum'):
        postgresql.ENUM(name=name).drop(op.get_bind(), checkfirst=True)
