from playwright.sync_api import sync_playwright


def test_login(page):
    page.goto("/login")
    page.fill("#user", "demo")
