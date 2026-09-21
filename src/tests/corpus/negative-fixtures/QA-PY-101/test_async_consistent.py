from playwright.async_api import async_playwright


async def test_login_flow(page):
    await page.goto("/login")
    # Consistent async usage is the point of this fixture; the assert
    # keeps the no-assertions rule (PY-003) out of the way.
    assert page.url.endswith("/login")


def sync_helper():
    # A documented sync helper in an otherwise-async suite — the
    # fixture's subject. Not a test function (no test_ prefix), so the
    # no-assertions rules (PY-003/PY-105) are out of scope by design.
    return True
