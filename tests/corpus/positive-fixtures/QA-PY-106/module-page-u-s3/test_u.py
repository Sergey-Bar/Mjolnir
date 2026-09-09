from playwright.sync_api import Page, sync_playwright

# Module-level page shared by every test below.
page = sync_playwright().start().new_page()


def test_page_u_s3_renders() -> None:
    page.goto("/page-u-s3")
    assert page.locator("main").is_visible()


def test_page_u_s3_details() -> None:
    page.goto("/page-u-s3/details")
    assert page.locator(".details").is_visible()
