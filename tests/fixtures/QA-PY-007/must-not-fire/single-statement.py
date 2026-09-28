# detectorRevision 5 (6.0): the single-statement exemption, in its plain form.
#
# This is the shape the rule's ORIGINAL must-fire fixture used, and it no
# longer fires. That is the fix, not a regression: "any exception of that
# type from any line in the block" needs more than one line to be a defect,
# and a one-line body has only the intended line.
#
# The reason the defect survived anyway is in the rule header — the old gate
# never fired for NESTED code, because the block was measured on the enclosing
# `with`. `nested-single-statement.py` in this directory is that regression
# fixture.
#
# Must NOT fire.
import pytest


def test_divide_by_zero():
    with pytest.raises(ZeroDivisionError):
        divide(1, 0)


def test_keyerror_from_lookup():
    with pytest.raises(KeyError):
        mapping["absent"]
