from playwright.sync_api import sync_playwright, expect


def test_no_assertions_one(page):
    page.goto("/landing")
    page.click("#cta")


def test_no_assertions_two(page):
    page.goto("/about")


def test_no_assertions_three(page):
    page.click("#menu")


def test_no_assertions_four(page):
    page.fill("#search", "query")


def test_no_assertions_five(page):
    page.goto("/contact")
    page.click("#send")
