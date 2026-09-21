def test_result_matches_expected():
    result = compute()
    assert result.id == expected_id
    assert len(result.items) == 3


def test_boolean_convention_name():
    # is_/has_/can_ names are conventionally boolean — not a bare
    # truthiness check on a complex object.
    is_valid = validate()
    assert is_valid
