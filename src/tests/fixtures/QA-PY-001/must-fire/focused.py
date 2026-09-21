import pytest

pytest.main(["tests/", "-k", "test_login"])


@pytest.mark.only
def test_checkout_only():
    assert checkout(cart) is True
