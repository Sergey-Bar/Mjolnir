from playwright.sync_api import Page


def test_prod_page(page: Page):
    page.goto("https://app.example.com/dashboard")


def test_api_call(page):
    response = page.request.get("https://api.example.com/v1/users")
    assert response.ok


def test_admin_console(page: Page):
    page.goto("https://admin.example.com/overview")


def test_staging_probe(page: Page):
    page.goto("https://staging.example.com/health")
