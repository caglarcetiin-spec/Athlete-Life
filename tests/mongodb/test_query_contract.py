from datetime import UTC, datetime

import pytest
from alos.mongo_query import check_expression, check_value, value


def test_null_constraints_follow_three_valued_sql_logic():
    for sql, values, expected in [
        ("x IS NOT NULL", {"x": 7}, True),
        ("x IS NOT NULL", {"x": None}, False),
        ("x IS NULL OR x BETWEEN 0 AND 10", {"x": None}, True),
        ("x IS NULL OR x BETWEEN 0 AND 10", {"x": 11}, False),
        ("x > 0", {"x": None}, None),
        (
            "status != 'work' OR (start_at IS NOT NULL AND end_at > start_at)",
            {
                "status": "work",
                "start_at": datetime(2026, 9, 15, 19, tzinfo=UTC),
                "end_at": datetime(2026, 9, 16, 3, tzinfo=UTC),
            },
            True,
        ),
    ]:
        assert check_value(check_expression(sql), values) is expected


def test_timestamps_have_one_orderable_utc_representation():
    assert value(datetime.fromisoformat("2026-09-15T22:00:00+03:00")) == value(
        datetime.fromisoformat("2026-09-15T19:00:00+00:00")
    )
    with pytest.raises(ValueError):
        value(datetime(2026, 9, 15))  # noqa: DTZ001 — invalid input is the fixture


def test_unknown_constraint_cannot_be_silently_ignored():
    with pytest.raises(ValueError):
        check_expression("abs(x) > 0")
