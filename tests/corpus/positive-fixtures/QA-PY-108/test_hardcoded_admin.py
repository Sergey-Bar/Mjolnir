from playwright.sync_api import Page, expect


def test_admin_dashboard(page: Page) -> None:
    """Hardcoded origin: breaks when environments change."""
    page.goto("https://admin.example.test/dashboard")
    expect(page.locator("#dashboard")).to_be_visible()
