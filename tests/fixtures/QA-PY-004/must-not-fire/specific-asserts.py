import pytest


def test_process_order(order):
    assert order.total == 42
    assert order.is_paid is True
    assert len(order.items) > 0
