# Phase 2 retune (revision 2): a `test_*` function referenced by name
# elsewhere in the file is test DATA (pytester-style runner script) —
# the collected assertion lives in the parent test. Must NOT fire.


def test_example_passes():
    pass


def test_example_fails():
    raise RuntimeError("boom")


def run_pytester_collected(pytester):
    pytester.makepyfile(
        test_example_passes,
        test_example_fails,
    )
    result = pytester.runpytest()
    result.assert_outcomes(passed=1, failed=1)
