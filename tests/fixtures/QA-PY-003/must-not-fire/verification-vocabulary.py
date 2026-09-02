import pytest


# Phase 2 retune (revision 2): pytest's other verification entrances are
# recognized (pytest.warns / deprecated_call / pytest.fail). Must NOT fire.
def test_warns_on_deprecation():
    with pytest.warns(DeprecationWarning):
        legacy_call()


def test_deprecated_call_raises():
    with pytest.deprecated_call():
        legacy_call()


def test_fails_with_reason():
    pytest.fail("not implemented yet", pytrace=False)


def legacy_call():
    raise DeprecationWarning("legacy")
