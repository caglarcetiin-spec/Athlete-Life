"""Planned ranges stay separate from actual set values."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "b384a0f98b62"
down_revision = "a879dac5341e"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("program_exercises", sa.Column("target_range", postgresql.JSONB(), nullable=True))
    op.add_column("prescription_set_slots", sa.Column("target_range", postgresql.JSONB(), nullable=True))


def downgrade():
    op.drop_column("prescription_set_slots", "target_range")
    op.drop_column("program_exercises", "target_range")
