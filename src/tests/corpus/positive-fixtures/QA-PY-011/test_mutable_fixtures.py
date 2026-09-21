import pytest


@pytest.fixture(scope="session")
def shared_config():
    return {"host": "staging", "port": 8080}


@pytest.fixture(scope="module")
def collected_ids():
    return []


@pytest.fixture(scope="session")
def accumulated_results():
    return set()


@pytest.fixture(scope="package")
def cache_store():
    return dict()


@pytest.fixture(scope="module")
def default_dict():
    return defaultdict(list)
