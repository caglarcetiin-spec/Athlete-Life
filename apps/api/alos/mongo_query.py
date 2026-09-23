"""Closed query/constraint compiler for the application's existing repository contract.

SQLAlchemy describes fields and predicates only. No SQL server, SQL execution,
Python eval, or client-supplied query text is used by the MongoDB backend.
"""

import operator
from datetime import UTC, date, datetime
from uuid import UUID

import sqlglot
from sqlalchemy.sql import operators
from sqlalchemy.sql.elements import BindParameter, BooleanClauseList, Grouping, Null, UnaryExpression
from sqlglot import exp


def value(raw):
    if isinstance(raw, datetime):
        if raw.tzinfo is None:
            raise ValueError("Repository timestamps require timezone")
        return raw.astimezone(UTC).isoformat(timespec="microseconds")
    if isinstance(raw, (UUID, date)):
        return raw.isoformat() if not isinstance(raw, UUID) else str(raw)
    if isinstance(raw, (tuple, list)):
        return [value(item) for item in raw]
    return raw


def query(expr):
    if isinstance(expr, Grouping):
        return query(expr.element)
    if isinstance(expr, BooleanClauseList):
        key = {operators.and_: "$and", operators.or_: "$or"}.get(expr.operator)
        if not key:
            raise ValueError("Unsupported repository boolean")
        return {key: [query(item) for item in expr.clauses]}
    if not hasattr(expr, "operator") or not hasattr(expr, "left"):
        raise ValueError("Unsupported repository predicate")
    left, right, op = expr.left, expr.right, expr.operator
    if not hasattr(left, "name") or not isinstance(right, (BindParameter, Null)):
        raise ValueError("Only field-to-parameter repository predicates are supported")
    rhs = None if isinstance(right, Null) else value(right.value)
    mapped = {
        operators.eq: "$eq",
        operators.ne: "$ne",
        operators.gt: "$gt",
        operators.ge: "$gte",
        operators.lt: "$lt",
        operators.le: "$lte",
        operators.is_: "$eq",
        operators.is_not: "$ne",
        operators.in_op: "$in",
        operators.not_in_op: "$nin",
    }.get(op)
    if not mapped:
        raise ValueError("Unsupported repository comparison")
    if op == operators.in_op:
        return {left.name: {"$in": [item for item in rhs if item is not None]}}
    if op in (operators.ne, operators.not_in_op):
        # SQL WHERE excludes UNKNOWN; Mongo $ne/$nin otherwise include NULL.
        if op == operators.not_in_op and not rhs:
            return {}
        if op == operators.not_in_op and None in rhs:
            return {"$expr": False}
        return {"$and": [{left.name: {mapped: rhs}}, {left.name: {"$ne": None}}]}
    return {left.name: {mapped: rhs}}


def criteria(expressions):
    parts = [query(item) for item in expressions]
    return {"$and": parts} if parts else {}


def ordering(expressions):
    result = []
    for item in expressions:
        direction = 1
        if isinstance(item, UnaryExpression):
            if item.modifier not in (operators.asc_op, operators.desc_op):
                raise ValueError("Unsupported repository ordering")
            direction = -1 if item.modifier == operators.desc_op else 1
            item = item.element
        if not hasattr(item, "name"):
            raise ValueError("Unsupported repository sort field")
        result.append((item.name, direction))
    return result


def check_expression(sql):
    """Parse only trusted, source-defined CHECK constraints; validate the entire AST."""
    node = sqlglot.parse_one(sql, read="postgres")
    allowed = (
        exp.Column,
        exp.Identifier,
        exp.Literal,
        exp.Null,
        exp.Boolean,
        exp.Paren,
        exp.And,
        exp.Or,
        exp.Not,
        exp.Is,
        exp.Between,
        exp.In,
        exp.EQ,
        exp.NEQ,
        exp.GT,
        exp.GTE,
        exp.LT,
        exp.LTE,
    )
    if any(not isinstance(child, allowed) for child in node.walk()):
        raise ValueError("Unsupported model CHECK constraint")
    return node


def check_value(node, row):
    if isinstance(node, exp.Column):
        return row[node.name]
    if isinstance(node, exp.Literal):
        return node.this if node.is_string else float(node.this)
    if isinstance(node, exp.Null):
        return None
    if isinstance(node, exp.Boolean):
        return node.this
    if isinstance(node, exp.Paren):
        return check_value(node.this, row)
    if isinstance(node, exp.Not):
        result = check_value(node.this, row)
        return None if result is None else not result
    if isinstance(node, (exp.And, exp.Or)):
        left, right = check_value(node.this, row), check_value(node.expression, row)
        if isinstance(node, exp.And):
            return (
                False if left is False or right is False else None if left is None or right is None else True
            )
        return True if left is True or right is True else None if left is None or right is None else False
    if isinstance(node, exp.Is):
        result = check_value(node.this, row) is check_value(node.expression, row)
        return not result if node.args.get("negate") else result
    if isinstance(node, exp.Between):
        item, low, high = (check_value(node.args[k], row) for k in ("this", "low", "high"))
        return None if item is None or low is None or high is None else low <= item <= high
    if isinstance(node, exp.In):
        item = check_value(node.this, row)
        return None if item is None else item in [check_value(x, row) for x in node.expressions]
    operation = {
        exp.EQ: operator.eq,
        exp.NEQ: operator.ne,
        exp.GT: operator.gt,
        exp.GTE: operator.ge,
        exp.LT: operator.lt,
        exp.LTE: operator.le,
    }.get(type(node))
    if operation:
        left, right = check_value(node.this, row), check_value(node.expression, row)
        return None if left is None or right is None else operation(left, right)
    raise ValueError("Unsupported model CHECK node")
