import asyncio

from playwright.async_api import async_playwright
from playwright.sync_api import sync_playwright


def test_a() -> None:
    """Half-migrated flow: async API drives the browser, sync API asserts."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("/a")
        page.wait_for_selector(".loaded")


async def test_a_async() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("/a")
        page.wait_for_selector(".loaded")