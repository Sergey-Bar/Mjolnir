import pytest


def test_divide_by_zero():
    with pytest.raises(ZeroDivisionError, match="division by zero"):
        divide(1, 0)
