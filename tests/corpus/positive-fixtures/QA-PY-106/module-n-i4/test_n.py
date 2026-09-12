from playwright.sync_api import Page, sync_playwright

# Module-level page shared by every test below.
page = sync_playwright().start().new_page()


def test_n_renders() -> None:
    page.goto("/n")
    assert page.locator("main").is_visible()


def test_n_rows() -> None:
    page.goto("/n/rows")
    assert page.locator(".row").first.is_visible()