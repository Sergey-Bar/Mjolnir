# Phase 2 retune (revision 2): `raises ... as exc_info` followed by an
# assert/expect on excinfo verifies the message without match= — the
# dominant measured FP cluster (docs/FP-AUDIT.md n=20). Must NOT fire.
import pytest


def test_missing_parameter_message():
    with pytest.raises(MissingParameter) as exc_info:
        parse([])
    assert "missing argument" in str(exc_info.value)


def test_type_error_message():
    with pytest.raises(TypeError) as err:
        combine(1)
    assert "cannot combine" in err.value.args[0]


def parse(argv):
    raise MissingParameter("missing argument: --out")


def combine(x):
    raise TypeError("cannot combine")


class MissingParameter(Exception):
    pass
