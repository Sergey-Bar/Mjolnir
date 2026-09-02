# Phase 2 retune wave 2 (revision 3): path predicates, any()/all()
# aggregates, mock bookkeeping, and existence guards followed by a
# precise assert are not bare-truthiness defects. Must NOT fire.


def test_path_predicates(path1):
    p = path1.join("sampledir")
    assert p.check()
    assert p.exists()
    assert p.isdir()


def test_membership_predicate(result):
    assert any("invalid choice" in line for line in result.errlines)


def test_mock_bookkeeping():
    open_browser("http://some-url")
    assert webbrowser_open.called


def test_guard_then_precise():
    assert stdout
    assert "Listening on" in str(stdout.readline())
