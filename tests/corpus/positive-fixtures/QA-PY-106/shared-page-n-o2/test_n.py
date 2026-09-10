from playwright.sync_api import expect


def test_n_renders(shared_page) -> None:
    shared_page.goto("/n")
    expect(shared_page.locator("main")).to_be_visible()


def test_n_details(shared_page) -> None:
    shared_page.goto("/n/details")
    expect(shared_page.locator(".details")).to_be_visible()