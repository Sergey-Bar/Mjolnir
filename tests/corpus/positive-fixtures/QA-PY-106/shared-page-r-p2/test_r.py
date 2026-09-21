from playwright.sync_api import expect


def test_r_renders(shared_page) -> None:
    shared_page.goto("/r")
    expect(shared_page.locator("main")).to_be_visible()


def test_r_details(shared_page) -> None:
    shared_page.goto("/r/details")
    expect(shared_page.locator(".details")).to_be_visible()