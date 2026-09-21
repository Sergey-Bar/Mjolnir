import asyncio

from playwright.async_api import async_playwright
from playwright.sync_api import sync_playwright


def test_i() -> None:
    """Half-migrated flow: async API drives the browser, sync API asserts."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("/i")
        page.wait_for_selector(".loaded")


async def test_i_async() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("/i")
        page.wait_for_selector(".loaded")