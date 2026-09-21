import pytest


def test_divide_by_zero():
    with pytest.raises(ZeroDivisionError):
        divide(1, 0)
