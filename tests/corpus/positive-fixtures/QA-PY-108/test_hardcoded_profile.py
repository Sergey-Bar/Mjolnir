from playwright.sync_api import Page, expect


def test_profile_settings(page: Page) -> None:
    """Hardcoded origin on the profile flow."""
    page.goto("https://shop.example.test/profile")
    expect(page.locator("#profile")).to_be_visible()
