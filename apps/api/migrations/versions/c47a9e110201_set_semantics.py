"""Additive set semantics; untyped historic sets stay unknown."""

import sqlalchemy as sa
from alembic import op

revision = "c47a9e110201"
down_revision = "e912ac740de1"
branch_labels = None
depends_on = None


def upgrade():
    for table in ("program_exercises", "prescription_set_slots", "performed_sets"):
        op.add_column(table, sa.Column("catalog_version", sa.String(80), nullable=True))
        op.add_column(table, sa.Column("set_kind", sa.String(20), nullable=False, server_default="unknown"))
        op.add_column(table, sa.Column("superset_group", sa.String(80), nullable=True))
        op.add_column(table, sa.Column("sequence", sa.Integer(), nullable=True))


def downgrade():
    # Export these fields before rollback: dropping them otherwise loses the new semantics.
    for table in ("performed_sets", "prescription_set_slots", "program_exercises"):
        for field in ("sequence", "superset_group", "set_kind", "catalog_version"):
            op.drop_column(table, field)
