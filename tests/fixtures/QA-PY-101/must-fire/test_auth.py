from playwright.sync_api import sync_playwright


async def test_login(page):
    page.goto("/login")
    page.fill("#user", "demo")
