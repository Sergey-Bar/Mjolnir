# Phase 2 retune (revision 2): verification delegated to imported helper
# functions whose names assert or wait (the entire measured FP cohort:
# streamlit e2e helpers). Must NOT fire.
import pytest


def test_sidebar_markdown(expect_prefixed_markdown, page):
    page.goto("/app")
    expect_prefixed_markdown(page, "## Sidebar")


def test_snapshot_stable(assert_snapshot, page):
    page.goto("/app")
    assert_snapshot(page, "landing")


def test_no_flicker(verify_no_sidebar_flicker, page):
    page.goto("/app")
    verify_no_sidebar_flicker(page)


@pytest.fixture(name="expect_prefixed_markdown")
def _expect_prefixed_markdown():
    def _check(page, prefix):
        assert page.locator("h2").first.text_content().startswith(prefix)

    return _check


def assert_snapshot(page, name):
    page.screenshot(path=f"{name}.png")


def verify_no_sidebar_flicker(page):
    assert page.locator("[data-testid='sidebar']").is_visible()
