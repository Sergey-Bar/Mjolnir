from playwright.sync_api import Page


def test_dashboard_loads(page: Page):
    page.goto("/dashboard")
    assert page.get_by_role("heading").is_visible()
