# Phase 2 retune wave 2 (revision 3): multi-line excinfo assert chains
# and assignment-then-assert (`msg = str(exc_info.value)`) verify the
# message without match=. Must NOT fire.
import pytest


def test_multiline_chain():
    with pytest.raises(StreamlitAuthError) as exc_info:
        get_expose_tokens_config()
    assert (
        "Invalid expose_tokens configuration."
        in str(exc_info.value)
    )


def test_assignment_then_assert():
    with pytest.raises(StreamlitAuthError) as exc_info:
        validate_auth_credentials("default")
    msg = str(exc_info.value)
    assert "default authentication provider" in msg


def test_attribute_use():
    with pytest.raises(RerunException) as exc_info:
        rerun([1, 2])
    data = exc_info.value.rerun_data
    assert data.fragment_id_queue == ["frag_1"]
