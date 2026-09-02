from playwright.sync_api import sync_playwright


async def test_login_flow(page):
    await page.goto("/login")


async def test_signup_flow(page):
    await page.goto("/signup")


async def test_profile_flow(page):
    await page.goto("/profile")


async def test_settings_flow(page):
    await page.goto("/settings")
