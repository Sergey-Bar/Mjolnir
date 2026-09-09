from playwright.sync_api import Page, expect


def test_checkout_page(page: Page) -> None:
    """Hardcoded origin on the checkout flow."""
    page.goto("https://shop.example.test/checkout")
    expect(page.locator("#pay")).to_be_visible()
