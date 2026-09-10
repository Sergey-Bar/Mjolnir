from playwright.sync_api import Page, expect


def test_e_networkidle(page: Page) -> None:
    """networkidle wait on a websocket-heavy page — never settles."""
    page.goto("/e")
    page.wait_for_load_state("networkidle")
    expect(page.locator(".loaded")).to_be_visible()