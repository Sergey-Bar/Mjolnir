import re
from playwright.sync_api import Page, expect


def test_inventory_grid(page: Page):
    page.goto("https://app.example.com/inventory")
    row = page.get_by_role("row", name="premium").filter(has_text="active")
    expect(row).to_be_visible()


def test_nested_panels(page: Page):
    page.goto("https://app.example.com/panels")
    panel = page.get_by_test_id("admin-panel")
    assert panel.is_visible()
    child = panel.get_by_test_id("price")
    assert child.count() > 0
