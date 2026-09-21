def test_open_prod(page):
    page.goto("https://app.example.com/dashboard")
    assert page.get_by_text("Welcome").is_visible()
