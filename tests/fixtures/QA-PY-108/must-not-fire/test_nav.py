def test_open_dashboard(page):
    page.goto("/dashboard")
    assert page.get_by_text("Welcome").is_visible()
