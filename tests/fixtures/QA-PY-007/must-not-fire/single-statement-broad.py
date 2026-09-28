# detectorRevision 5 (6.0): the single-statement exemption now covers a BROAD
# exception type too.
#
# revision 4 exempted a single-statement block only when the type was
# specific, on the reasoning that "a broad root type always fires — the type
# alone pins nothing". That reasoning needs an earlier line: a multi-statement
# block can raise `Exception` from setup before the intended one. With ONE
# statement there is no earlier line, so the diagnosis cannot hold however
# broad the type is.
#
# These two are the adjudicated findings at pytest-dev/pytest f9554ee5
# `testing/test_compat.py:97` and `:107`. Must NOT fire.
import pytest


def test_helper_raises():
    helper = ErrorsHelper()
    with pytest.raises(Exception):
        _ = helper.raise_exception


def test_helper_raises_base():
    helper = ErrorsHelper()
    with pytest.raises(BaseException):
        assert safe_getattr(helper, "raise_baseexception", "default")
