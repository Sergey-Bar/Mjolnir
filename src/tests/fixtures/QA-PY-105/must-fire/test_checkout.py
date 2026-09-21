from playwright.sync_api import Page


def test_checkout_flow(page: Page):
    page.goto("/cart")
    page.click("text=Checkout")
    page.fill("#address", "Main st 1")
