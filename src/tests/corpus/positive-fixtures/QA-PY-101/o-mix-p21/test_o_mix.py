import pytest
from playwright.sync_api import sync_playwright


def launch_sync():
    with sync_playwright() as p:
        yield p.chromium.launch().new_page()


@pytest.fixture
def page_fixture():
    yield from launch_sync()


async def test_o_dashboard(page_fixture):
    await page_fixture.goto("/o")
    assert await page_fixture.locator(".ready").is_visible()