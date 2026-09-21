from playwright.sync_api import Page, expect


def test_l_workflow(page: Page) -> None:
    """Selector couples to layout position/generated ids."""
    page.goto("/app")
    page.locator("/html/body/div[2]/div[3]/button").click()
    expect(page.locator("#btn-2837")).to_be_visible()