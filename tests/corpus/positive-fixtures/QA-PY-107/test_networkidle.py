from playwright.sync_api import Page


def test_network_idle(page: Page):
    page.goto("/feed")
    page.wait_for_load_state("networkidle")


def test_infinite_scroll(page: Page):
    page.goto("/timeline")
    page.wait_for_load_state("networkidle")


def test_live_updates(page: Page):
    page.goto("/live")
    page.wait_for_load_state("networkidle")
