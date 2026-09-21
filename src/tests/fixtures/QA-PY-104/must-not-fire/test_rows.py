def test_row_visible(page):
    page.get_by_role("button", name="Open row").click()
    assert page.get_by_text("Details").is_visible()
