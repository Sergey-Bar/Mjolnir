import pytest


@pytest.fixture(scope="session")
def config():
    return load_config()


@pytest.fixture()
def cart():
    return {"items": []}
