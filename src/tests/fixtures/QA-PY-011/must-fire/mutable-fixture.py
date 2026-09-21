import pytest


@pytest.fixture(scope="session")
def shared_cart():
    return {"items": []}
