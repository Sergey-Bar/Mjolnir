import pytest


def test_sanity():
    value = compute()
    assert value == expected


def test_real_comparison():
    assert 2 + 2 == 4


def compute():
    return 4


expected = 4
