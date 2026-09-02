import pytest


# pytest.main(["-k", "auth"])
pytest.main(["tests/test_auth.py::test_login"])
pytest.main(["tests/test_payments.py::test_charge"])
pytest.main(["tests/test_search.py", "-k", "smoke"])


@pytest.mark.only
def test_marked_only():
    assert True


@pytest.mark.only
def test_another_marked_only():
    assert True


@pytest.mark.only
def test_third_marked_only():
    assert True
