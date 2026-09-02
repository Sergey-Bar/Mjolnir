from playwright.sync_api import Page


def test_relative_paths(page: Page):
    # Relative URLs resolve against baseURL — the fixture's subject.
    # The explicit assert keeps the no-assertions rule (PY-003) away.
    page.goto("/dashboard")
    assert page.url.endswith("/dashboard")


def test_localhost_api(page):
    response = page.request.get("http://localhost:3000/v1/users")
    # The .ok property check is the fixture's subject (loopback allowed);
    # comparing it keeps the bare-truthiness rule (PY-004) away.
    assert response.ok is True
