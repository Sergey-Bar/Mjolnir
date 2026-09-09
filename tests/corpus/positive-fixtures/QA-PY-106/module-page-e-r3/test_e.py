from playwright.sync_api import Page, sync_playwright

# Module-level page shared by every test below.
page = sync_playwright().start().new_page()


def test_{name}_renders() -> None:
    page.goto("/{name}")
    assert page.locator("main").is_visible()


def test_{name}_details() -> None:
    page.goto("/{name}/details")
    assert page.locator(".details").is_visible()
