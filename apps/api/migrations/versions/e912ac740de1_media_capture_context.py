"""Preserve explicitly entered capture dates and measurement context."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "e912ac740de1"
down_revision = "b384a0f98b62"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("media_objects", sa.Column("captured_date", sa.Date(), nullable=True))
    op.add_column(
        "media_objects",
        sa.Column("details", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
    )


def downgrade():
    op.drop_column("media_objects", "details")
    op.drop_column("media_objects", "captured_date")
