# detectorRevision 4 (6.0).
#
# The shapes the rule EXISTS for, all of which the structural gate must keep
# catching. "0 of 12 adjudicated false positives survive" is only half the
# result — a rule that stopped firing entirely would score the same and be
# worth nothing.
import pytest


def test_bare_object(order):
    # The original must-fire shape.
    assert order


def test_attribute_chain(result):
    # Truthiness of a SUB-object, not of a call: a wrong object with a truthy
    # `.exception` still passes.
    assert result.exception


def test_deep_attribute_chain(result):
    assert result.output.stderr.records


def test_non_conventional_name(response):
    # Not `is_*`/`has_*`/`can_*`, so the naming convention cannot excuse it.
    assert response.json
