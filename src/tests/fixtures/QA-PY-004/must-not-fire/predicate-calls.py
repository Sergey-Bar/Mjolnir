# Phase 2 retune (revision 2): boolean-predicate calls are real checks —
# the truthiness IS the assertion (the measured FP clusters: isinstance
# type guards, startswith content checks). Must NOT fire.


def test_type_guard():
    result = make_thing()
    assert isinstance(result, dict)


def test_content_predicate():
    message = render("hi")
    assert message.startswith("hi")
    assert message.endswith("!")


def make_thing():
    return {}


def render(text):
    return text + "!"
