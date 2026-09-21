import re
from playwright.sync_api import Page, expect


def test_inventory_grid(page: Page):
    page.goto("https://app.example.com/inventory")
    row = page.locator("xpath=//table[@id='inventory']/tr[3]")
    expect(row).to_be_visible()


def test_nested_panels(page: Page):
    page.goto("https://app.example.com/panels")
    panel = page.locator("xpath=/html/body/div[2]/div/section")
    assert panel.is_visible()
    child = page.locator("div:nth-child(4) > span.price")
    assert child.count() > 0


def test_absolute_dom_path(page: Page):
    page.goto("https://app.example.com/admin")
    item = page.locator("/html/body/div[1]/main/ul/li[2]")
    assert item.is_visible()
