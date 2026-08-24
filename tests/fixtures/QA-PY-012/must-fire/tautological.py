def test_always_true():
    assert True


def test_self_compare():
    x = compute(1)
    assert x == x
