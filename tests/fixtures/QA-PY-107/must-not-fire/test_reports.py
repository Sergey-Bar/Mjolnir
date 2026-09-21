def test_data_loaded(page):
    page.goto("/reports")
    expect(page.locator("table")).to_be_visible()
