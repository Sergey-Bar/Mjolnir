from myapp.auth import login


def test_login_success():
    result = login("ada", "secret123")
    assert result.ok is True


def test_login_failure():
    with pytest.raises(ValueError, match="empty"):
        login("", "")
