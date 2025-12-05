"""Add user credits fields and generation logs

Revision ID: 6b5b0f2d7e1a
Revises: d98dd8ec85a3
Create Date: 2025-02-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "6b5b0f2d7e1a"
down_revision = "d98dd8ec85a3"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user",
        sa.Column("plan", sa.String(length=50), nullable=False, server_default="free"),
    )
    op.add_column(
        "user",
        sa.Column("credits_balance", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("user", "plan", server_default=None)
    op.alter_column("user", "credits_balance", server_default=None)

    op.create_table(
        "generationlog",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("mode", sa.String(length=50), nullable=False),
        sa.Column("prompt", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=255), nullable=False),
        sa.Column("cost", sa.Integer(), nullable=False, server_default="1"),
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


def downgrade():
    op.drop_table("generationlog")
    op.drop_column("user", "credits_balance")
    op.drop_column("user", "plan")
