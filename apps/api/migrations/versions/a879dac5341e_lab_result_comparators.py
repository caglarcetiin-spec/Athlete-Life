"""Preserve laboratory censored results instead of treating limits as exact values."""

import sqlalchemy as sa
from alembic import op

revision = "a879dac5341e"
down_revision = "f137c8e642a1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "lab_observations", sa.Column("comparator", sa.String(2), server_default="=", nullable=False)
    )
    op.create_check_constraint(
        "lab_comparator", "lab_observations", "comparator IN ('=', '<', '>', '≤', '≥')"
    )


def downgrade():
    op.drop_constraint("lab_comparator", "lab_observations", type_="check")
    op.drop_column("lab_observations", "comparator")
