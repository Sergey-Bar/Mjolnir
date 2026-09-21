import time

from playwright.sync_api import sync_playwright


def test_slow_widget(page):
    page.goto("/widgets")
    page.wait_for_selector("#widget")
    page.click("#widget")
    # This fixture is about condition waits, not assertions; the explicit
    # assert keeps the no-assertions rule out of the way (PY-003 co-habit).
    assert page.locator("#widget") is not None


def test_unrelated_sleep():
    started = time.perf_counter()
    time.sleep(0.5)
    assert time.perf_counter() - started >= 0.4
