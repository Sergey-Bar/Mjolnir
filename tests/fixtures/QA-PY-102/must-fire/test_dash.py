import time

from playwright.sync_api import Page


def test_dashboard_loads(page: Page):
    page.goto("/dashboard")
    time.sleep(3)
    assert page.get_by_role("heading").is_visible()
