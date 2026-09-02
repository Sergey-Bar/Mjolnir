from playwright.sync_api import Page


def test_relative_paths(page: Page):
    page.goto("/dashboard")


def test_localhost_api(page):
    response = page.request.get("http://localhost:3000/v1/users")
    assert response.ok
