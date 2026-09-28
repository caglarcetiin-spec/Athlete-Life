"""Short-lived email registration challenges; existing accounts unchanged."""

import sqlalchemy as sa
from alembic import op

revision = "a829email001"
down_revision = "c47a9e110203"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "email_challenges",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_email_challenges_email", "email_challenges", ["email"])
    op.create_index("ix_email_challenges_expires_at", "email_challenges", ["expires_at"])


def downgrade():
    op.drop_table("email_challenges")
