# Phase 2 retune wave 2 (revision 3): helper-name verification counts —
# the PY-105 cohort shape, seen in the PY-003 delta sample (streamlit
# e2e helpers). Must NOT fire.
import pytest


def test_reruns_when_r_is_pressed(app):
    expect_prefixed_markdown(app, "Script runs:", "1", exact_match=False)
    app.keyboard.type("r")
    wait_for_app_run(app)
    expect_prefixed_markdown(app, "Script runs:", "2", exact_match=False)


def test_login_successful(app, app_base_url):
    _click_and_wait_for_oauth_redirect(app, "TEST LOGIN", app_base_url)
    expect_markdown(app, "authtest@example.com")


def test_ace(app):
    _select_component(app, "ace")
    _expect_no_exception(app)
    _expect_iframe_attached(app)
