def test_home(page):
    page.goto("/")
    assert page.title() != ""
