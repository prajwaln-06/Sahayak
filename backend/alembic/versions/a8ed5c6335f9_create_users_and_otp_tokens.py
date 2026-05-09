"""create_users_and_otp_tokens

Revision ID: a8ed5c6335f9
Revises: 
Create Date: 2026-05-09 01:26:02.682740

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a8ed5c6335f9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users and otp_tokens tables."""

    # KYC status enum
    kyc_status_enum = postgresql.ENUM(
        'NONE', 'PENDING', 'APPROVED', 'REJECTED',
        name='kyc_status_enum',
        create_type=True,
    )
#     kyc_status_enum.create(op.get_bind(), checkfirst=True)

    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('phone', sa.String(20), nullable=False, unique=True, index=True),
        sa.Column('email', sa.String(255), nullable=True, unique=True, index=True),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('is_phone_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_host', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('trust_score', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('kyc_status', kyc_status_enum, nullable=False, server_default='NONE'),
        sa.Column('profile_photo_url', sa.Text(), nullable=True),
        sa.Column('upi_id', sa.String(100), nullable=True),
        sa.Column('bank_account', sa.String(50), nullable=True),
        sa.Column('ifsc', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # OTP tokens table
    op.create_table(
        'otp_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('otp_code', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )


def downgrade() -> None:
    """Drop users and otp_tokens tables."""
    op.drop_table('otp_tokens')
    op.drop_table('users')

    # Drop the enum type
    kyc_status_enum = postgresql.ENUM(
        'NONE', 'PENDING', 'APPROVED', 'REJECTED',
        name='kyc_status_enum',
    )
    kyc_status_enum.drop(op.get_bind(), checkfirst=True)
