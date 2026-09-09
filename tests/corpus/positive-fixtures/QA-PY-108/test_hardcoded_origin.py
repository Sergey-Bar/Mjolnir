from playwright.sync_api import Page, expect


def test_settings_page(page: Page) -> None:
    """Hardcoded origin: breaks when environments change."""
    page.goto("https://app.example.test/settings")
    expect(page.locator("#settings")).to_be_visible()
