"""Explicit administrator grants; signup cannot assign this role."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "b829admin001"
down_revision = "a829email001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "administrators",
        sa.Column("user_id", UUID(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("administrators")
