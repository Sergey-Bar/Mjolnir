import pytest
from myapp.auth import login


def test_login_success():
    result = login("ada", "secret123")
    assert result.ok is True


def test_login_failure():
    with pytest.raises(ValueError):
        login("", "")


@pytest.mark.skip(reason="not implemented yet")
def test_password_reset():
    assert reset_password("ada") is True


@pytest.mark.xfail
def test_legacy_flow():
    assert old_flow() is True
