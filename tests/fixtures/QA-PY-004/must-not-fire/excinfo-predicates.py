# detectorRevision 4 (6.0) REGRESSION FIXTURE.
#
# Revisions 2 and 3 answered each measured false-positive cluster by adding
# its METHOD NAME to a `predicateRe` list: isinstance, startswith, exists,
# check, any, all, re.match, and so on. Ten clusters later the list still
# missed pytest's own exception-info predicates, and 10 of the 12 findings
# adjudicated against pytest-dev/pytest at f9554ee5 were
# `assert exc_info.group_contains(...)` / `assert excinfo.errisinstance(...)`.
#
# A vocabulary of names is the wrong shape for the fact being expressed. The
# rule's own premise carries it structurally: a CALL does not pass for "any
# truthy value" — it passes for whatever that call computed. A bare identifier
# or attribute chain does.
#
# Must NOT fire, and the enclosing test carries a NEGATIVE case for the same
# claim, which is what makes the assert discriminating.
import pytest


def test_group_contains():
    with pytest.raises(ExceptionGroup) as exc_info:
        raise ExceptionGroup("", [RuntimeError()])
    assert exc_info.group_contains(RuntimeError)
    assert not exc_info.group_contains(ValueError)


def test_errisinstance():
    with pytest.raises(ValueError) as excinfo:
        h()
    assert excinfo.errisinstance(ValueError)
    assert not excinfo.errisinstance(TypeError)


def test_nested_group():
    with pytest.raises(ExceptionGroup) as exc_info:
        raise ExceptionGroup("", [ExceptionGroup("", [RuntimeError()])])
    assert exc_info.group_contains(RuntimeError, depth=1)
    assert not exc_info.group_contains(RuntimeError, depth=2)
