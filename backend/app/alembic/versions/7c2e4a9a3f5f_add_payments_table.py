"""Add payments table for Yookassa tracking

Revision ID: 7c2e4a9a3f5f
Revises: 6b5b0f2d7e1a
Create Date: 2025-02-10 00:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "7c2e4a9a3f5f"
down_revision = "6b5b0f2d7e1a"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "payment",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("yookassa_id", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("plan", sa.String(length=50), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
    )
    op.create_index(
        "ix_payment_yookassa_id",
        "payment",
        ["yookassa_id"],
        unique=True,
    )


def downgrade():
    op.drop_index("ix_payment_yookassa_id", table_name="payment")
    op.drop_table("payment")
