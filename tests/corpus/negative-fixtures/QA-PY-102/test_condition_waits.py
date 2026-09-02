import time

from playwright.sync_api import sync_playwright


def test_slow_widget(page):
    page.goto("/widgets")
    page.wait_for_selector("#widget")
    page.click("#widget")


def test_unrelated_sleep():
    time.sleep(0.5)
