"""
Minimal, safe auto-migration: adds newly-introduced columns to tables that
already exist, so a schema change (like this phase's new `on_hold` column
on inventory_balances) doesn't break a restart against a database created
by an earlier version of this backend.

Only ever ADDS nullable columns with a default — never drops, renames, or
changes an existing column. `Base.metadata.create_all()` already handles
brand-new tables correctly; this only covers the one case it can't
(a new column on a table that already exists). For anything beyond a
simple additive column, use a real migration tool — Alembic is already in
requirements.txt.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def add_missing_columns(engine: Engine, table_name: str, columns: dict) -> None:
    """`columns` maps column name -> SQL column type/definition, e.g.
    {"on_hold": "FLOAT DEFAULT 0"}. No-ops for a table that doesn't exist
    yet — a fresh install creates it correctly via create_all already."""
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns(table_name)}
    with engine.begin() as conn:
        for col_name, col_def in columns.items():
            if col_name not in existing:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def}"))
