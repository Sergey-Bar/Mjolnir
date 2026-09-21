"""Phase 1 fixture: patterns inside string literals must NOT fire."""


def test_documents_anti_pattern():
    doc = "time.sleep(5) is bad practice in tests"
    warning = 'Avoid time.sleep(10) — use polling instead'
    assert len(doc) > 0
    assert len(warning) > 0
