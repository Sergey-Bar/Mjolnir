def test_data_loaded(page):
    page.goto("/reports")
    page.wait_for_load_state("networkidle")
    assert page.locator("table").count() > 0
