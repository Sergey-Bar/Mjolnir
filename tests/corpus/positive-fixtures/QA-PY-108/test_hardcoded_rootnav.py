from playwright.sync_api import Page, expect


def test_root_navigation(page: Page) -> None:
    """Hardcoded origin in a smoke test."""
    page.goto("https://www.example.test/")
    expect(page.locator("header")).to_be_visible()
