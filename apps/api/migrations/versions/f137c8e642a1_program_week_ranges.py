"""Explicit weekly ranges for program phases; existing programs repeat throughout."""

import sqlalchemy as sa
from alembic import op

revision = "f137c8e642a1"
down_revision = "d9403fbd67bd"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("weekly_slots", sa.Column("first_week", sa.Integer(), server_default="1", nullable=False))
    op.add_column("weekly_slots", sa.Column("last_week", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "weekly_slots_week_bounds",
        "weekly_slots",
        "first_week BETWEEN 1 AND 52 AND (last_week IS NULL OR (last_week >= first_week AND last_week <= 52))",
    )


def downgrade():
    op.drop_constraint("weekly_slots_week_bounds", "weekly_slots", type_="check")
    op.drop_column("weekly_slots", "last_week")
    op.drop_column("weekly_slots", "first_week")
