from playwright.sync_api import sync_playwright


def test_i() -> None:
    """Sync wrapper around what the module elsewhere drives async."""
    with sync_playwright() as p:
        page = p.chromium.launch().new_page()
        page.goto("/i")
        page.wait_for_selector(".ready")