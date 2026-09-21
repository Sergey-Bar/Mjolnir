from playwright.sync_api import expect


def test_e_renders(shared_page) -> None:
    shared_page.goto("/e")
    expect(shared_page.locator("main")).to_be_visible()


def test_e_details(shared_page) -> None:
    shared_page.goto("/e/details")
    expect(shared_page.locator(".details")).to_be_visible()