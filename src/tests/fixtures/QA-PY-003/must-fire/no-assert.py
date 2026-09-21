from myapp.auth import login, logout


def test_login_no_assertion():
    login("ada", "secret123")


def test_logout_also_none():
    logout("ada")
