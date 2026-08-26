from playwright.sync_api import Page, expect


def test_checkout_flow(page: Page):
    page.goto("/cart")
    page.click("text=Checkout")
    page.fill("#address", "Main st 1")
    expect(page).to_have_url("**/order/confirm")
