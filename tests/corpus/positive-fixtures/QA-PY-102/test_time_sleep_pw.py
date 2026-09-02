import time

from playwright.sync_api import sync_playwright


def test_slow_widget(page):
    page.goto("/widgets")
    time.sleep(3)
    page.click("#widget")


def test_chart_render(page):
    page.goto("/charts")
    time.sleep(5)


def test_export_ready(page):
    page.goto("/export")
    time.sleep(2)


def test_report_wait(page):
    page.goto("/reports")
    time.sleep(4)
