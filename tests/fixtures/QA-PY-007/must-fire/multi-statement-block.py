# detectorRevision 5 (6.0): a MULTI-STATEMENT block is the risk surface.
#
# `with pytest.raises(T):` accepts any T from ANY line in the block, so a
# setup line that raises T — for an unrelated reason — passes the test. That
# only needs more than one line.
#
# These are the shapes the adjudicated TRUE POSITIVES took, taken from
# pytest-dev/pytest at f9554ee5 (`testing/test_recwarn.py:123` and `:127`).
import pytest


def test_exit_before_enter():
    with pytest.raises(RuntimeError):
        rec = WarningsRecorder(_ispytest=True)
        rec.__exit__(None, None, None)


def test_nested_enter_uses_context_manager():
    with pytest.raises(RuntimeError):
        rec = WarningsRecorder(_ispytest=True)
        with rec:
            with rec:
                pass


def test_construction_then_raise():
    with pytest.raises(KeyError):
        lookup = build_index()
        lookup.fetch(missing)
