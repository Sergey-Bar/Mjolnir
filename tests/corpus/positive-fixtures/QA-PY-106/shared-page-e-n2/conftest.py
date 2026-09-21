import pytest
from playwright.sync_api import Page, sync_playwright


@pytest.fixture(scope="module")
def shared_page() -> Page:
    """MODULE-scoped page: every test in this module mutates the same page."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        yield page
        browser.close()
