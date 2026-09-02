from playwright.async_api import async_playwright


async def test_login_flow(page):
    await page.goto("/login")


def test_sync_helper():
    return True
