# detectorRevision 4 (6.0).
#
# A CONSTANT is not a complex object, and `assert False` is how a test
# manufactures an AssertionError to assert on its traceback — the next lines
# prove that is what it is for. One adjudicated finding is exactly this shape
# (`pytest-dev/pytest` `testing/code/test_code.py:192` at f9554ee5), where the
# very next statement builds a regex on the traceback.
#
# Must NOT fire.
import pytest
import traceback


def test_traceback_str():
    with pytest.raises(AssertionError):
        assert False
    pattern = r"  File '.*test_traceback_str.py':\d+ in test_traceback_str\n  assert False"
    assert pattern in traceback.format_exc()


def test_always_true():
    assert True
