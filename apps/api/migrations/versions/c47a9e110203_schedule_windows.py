"""Optional explicit availability and planned sleep; never actual sleep."""

import sqlalchemy as sa
from alembic import op

revision = "c47a9e110203"
down_revision = "c47a9e110202"
branch_labels = None
depends_on = None


def upgrade():
    for key in ("available_start_local", "available_end_local", "sleep_start_local", "sleep_end_local"):
        op.add_column("shifts", sa.Column(key, sa.String(5), nullable=True))
    op.add_column("shifts", sa.Column("training_minutes", sa.Integer(), nullable=True))


def downgrade():
    for key in (
        "available_start_local",
        "available_end_local",
        "sleep_start_local",
        "sleep_end_local",
        "training_minutes",
    ):
        op.drop_column("shifts", key)
