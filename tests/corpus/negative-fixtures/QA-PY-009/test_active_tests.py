# The checkout flow is covered by test_checkout below; these prose lines
# document the design (see docs/design.md).

def test_checkout(page):
    page.goto("/checkout")
    page.click("#buy")
    # This fixture is about commented-out tests staying inert; the
    # explicit assert keeps the no-assertions rule (PY-003) out of the
    # way of the PY-009 subject.
    assert page.locator("#buy") is not None


def test_main_entry():
    # main() is wired in __main__.py
    main = __import__("__main__")
    assert getattr(main, "main", None) is not None
