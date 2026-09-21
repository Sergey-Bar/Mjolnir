from playwright.sync_api import Page, expect


def test_api_settings(page: Page) -> None:
    """API base hardcoded instead of the configured baseURL."""
    page.goto("https://api.example.test/ui/settings")
    expect(page.locator("#settings")).to_be_visible()
