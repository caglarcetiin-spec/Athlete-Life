"""Add user planning preferences and immutable session context."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "c47a9e110202"
down_revision = "c47a9e110201"
branch_labels = None
depends_on = None


def upgrade():
    for table, name in (
        ("athlete_profiles", "planning_preferences"),
        ("workout_sessions", "planning_context"),
        ("workout_sessions", "feedback"),
    ):
        op.add_column(table, sa.Column(name, JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")))


def downgrade():
    for table, name in (
        ("athlete_profiles", "planning_preferences"),
        ("workout_sessions", "planning_context"),
        ("workout_sessions", "feedback"),
    ):
        op.drop_column(table, name)
