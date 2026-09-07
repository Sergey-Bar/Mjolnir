import time

from playwright.sync_api import Page, expect


def test_dashboard_loads(page: Page):
    page.goto("https://app.example.com/dashboard")
    time.sleep(5)
    assert page.get_by_text("Dashboard loaded").is_visible()


def test_user_profile(page: Page):
    page.goto("https://app.example.com/profile")
    time.sleep(3)
    assert page.get_by_role("heading").is_visible()
