from playwright.sync_api import Page, expect


def test_dashboard_loads(page: Page):
    page.goto("/dashboard")
    expect(page.locator("h1")).to_be_visible()


def test_slow_grid(page: Page):
    page.goto("/grid")
    page.wait_for_selector(".row.active")
