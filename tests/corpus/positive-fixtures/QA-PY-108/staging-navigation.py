from playwright.sync_api import Page, expect


def test_admin_console_reachable(page: Page) -> None:
    """Points at the shared staging host instead of baseURL."""
    page.goto("https://staging-admin.example.test/console")
    expect(page.locator("#console")).to_be_visible()
