from playwright.sync_api import expect


def test_a_renders(shared_page) -> None:
    shared_page.goto("/a")
    expect(shared_page.locator("main")).to_be_visible()


def test_a_details(shared_page) -> None:
    shared_page.goto("/a/details")
    expect(shared_page.locator(".details")).to_be_visible()