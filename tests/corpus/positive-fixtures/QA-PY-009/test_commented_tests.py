# def test_old_checkout(page):
#     page.click("#buy")

# def test_legacy_login(page):
#     page.goto("/login")

# def test_removed_flow(page):
#     page.goto("/removed")

# pytest.main(["tests/test_api.py"])

# test_full_suite()

# test_payments_suite()


def test_active_search(page):
    page.goto("/search")
