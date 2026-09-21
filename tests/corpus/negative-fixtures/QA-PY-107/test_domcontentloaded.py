from playwright.sync_api import Page


def test_feed(page: Page):
    page.goto("/feed")
    page.wait_for_selector(".post")


def test_dom_ready(page: Page):
    page.wait_for_load_state("domcontentloaded")
