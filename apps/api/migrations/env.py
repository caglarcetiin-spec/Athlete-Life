from alembic import context
from sqlalchemy import engine_from_config, pool

from alos import models  # noqa: F401
from alos.config import Settings
from alos.db import Base

config = context.config
config.set_main_option("sqlalchemy.url", Settings().database_url.replace("%", "%%"))


def run():
    if context.is_offline_mode():
        context.configure(url=Settings().database_url, target_metadata=Base.metadata, literal_binds=True)
        with context.begin_transaction():
            context.run_migrations()
    else:
        connectable = engine_from_config(
            config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool
        )
        with connectable.connect() as connection, connection.begin():
            connection.exec_driver_sql("SELECT pg_advisory_xact_lock(2026091602)")
            context.configure(connection=connection, target_metadata=Base.metadata)
            with context.begin_transaction():
                context.run_migrations()


run()
