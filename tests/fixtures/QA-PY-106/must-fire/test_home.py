page = browser.new_page()


def test_home(page=None):
    page.goto("/")
    assert page.title() != ""
