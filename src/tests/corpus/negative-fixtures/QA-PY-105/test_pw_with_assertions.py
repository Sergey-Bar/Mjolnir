from playwright.sync_api import Page, expect


def test_landing(page: Page):
    page.goto("/landing")
    expect(page.locator("#cta")).to_be_visible()


def test_search(page: Page):
    page.fill("#search", "query")
    expect(page.locator("#results")).to_have_count(5)
