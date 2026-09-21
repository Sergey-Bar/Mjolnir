import pytest

pytest.main(["tests/test_flows.py::test_checkout_complete"])
pytest.main(["tests/test_flows.py::test_checkout_abandoned"])
pytest.main(["tests/test_search.py::test_search_basic"])


@pytest.mark.only
def test_marked_only_flow():
    assert True


@pytest.mark.only
def test_marked_only_billing():
    assert True
