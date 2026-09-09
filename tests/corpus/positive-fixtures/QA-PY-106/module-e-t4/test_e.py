from playwright.sync_api import Page, sync_playwright

# Module-level page shared by every test below.
page = sync_playwright().start().new_page()


def test_e_renders() -> None:
    page.goto("/e")
    assert page.locator("main").is_visible()


def test_e_rows() -> None:
    page.goto("/e/rows")
    assert page.locator(".row").first.is_visible()