import pytest


def test_divide_by_zero():
    # detectorRevision 5 (6.0). This fixture used to be:
    #
    #     with pytest.raises(ZeroDivisionError):
    #         divide(1, 0)
    #
    # and it no longer fires, correctly. A single-statement block has no
    # earlier line that could raise ZeroDivisionError by accident, so
    # "any exception of that type from any line" cannot weaken it — there is
    # only one line, and it is the intended one.
    #
    # The rule's premise needs more than one statement. Seven of the eleven
    # findings adjudicated against pytest-dev/pytest at f9554ee5 were
    # single-statement blocks scored as multi-statement because the rule
    # measured the ENCLOSING `with saved_fd(...)` block instead of the one
    # that gated the raise. Fixing that, and widening the gate to cover a
    # broad exception type on a one-line body, took the rule from 75% FP to
    # 0% FP over the same findings.
    with pytest.raises(ZeroDivisionError):
        divisor = compute_divisor()
        result = divisor / 0
        assert result is not None
