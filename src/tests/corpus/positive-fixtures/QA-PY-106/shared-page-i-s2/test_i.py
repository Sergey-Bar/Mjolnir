from playwright.sync_api import expect


def test_i_renders(shared_page) -> None:
    shared_page.goto("/i")
    expect(shared_page.locator("main")).to_be_visible()


def test_i_details(shared_page) -> None:
    shared_page.goto("/i/details")
    expect(shared_page.locator(".details")).to_be_visible()