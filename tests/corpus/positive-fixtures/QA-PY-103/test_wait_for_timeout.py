from playwright.sync_api import Page, expect


def test_dashboard_loads(page: Page):
    page.goto("/dashboard")
    page.wait_for_timeout(3000)
    expect(page.locator("h1")).to_be_visible()


def test_slow_grid(page: Page):
    page.goto("/grid")
    page.wait_for_timeout(5000)


def test_export_dialog(page: Page):
    page.goto("/export")
    page.wait_for_timeout(1000)


def test_chart_render(page: Page):
    page.goto("/charts")
    page.wait_for_timeout(2500)
