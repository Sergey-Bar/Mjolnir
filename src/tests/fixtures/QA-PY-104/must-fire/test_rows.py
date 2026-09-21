def test_row_visible(page):
    page.locator('xpath=//div[@id="app"]/div/div[2]/table/tr[3]').click()
    assert page.get_by_text("Details").is_visible()
