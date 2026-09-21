from playwright.sync_api import sync_playwright


def run_suite():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        page.goto("/landing")


def other_context():
    context = "naming collision but indented"
    return context
