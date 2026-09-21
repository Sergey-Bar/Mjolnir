from playwright.sync_api import Page, sync_playwright

# Module-level page shared by every test below.
page = sync_playwright().start().new_page()


def test_r_renders() -> None:
    page.goto("/r")
    assert page.locator("main").is_visible()


def test_r_rows() -> None:
    page.goto("/r/rows")
    assert page.locator(".row").first.is_visible()