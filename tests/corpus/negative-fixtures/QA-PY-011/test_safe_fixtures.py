import pytest


@pytest.fixture(scope="function")
def fresh_cart():
    return []


@pytest.fixture(scope="session")
def immutable_settings():
    return ("staging", 8080)


@pytest.fixture(scope="module")
def api_base_url():
    return "https://staging.example.com"


@pytest.fixture(scope="session")
def build_cart():
    def _make(items):
        return list(items)

    return _make
