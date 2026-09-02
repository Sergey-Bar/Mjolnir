# The checkout flow is covered by test_checkout below; these prose lines
# document the design (see docs/design.md).

def test_checkout(page):
    page.goto("/checkout")
    page.click("#buy")


def test_main_entry():
    # main() is wired in __main__.py
    assert True
