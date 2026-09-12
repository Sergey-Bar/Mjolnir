# detectorRevision 4 (bug-audit 3.12): a test_* def nested inside a
# FUNCTION (not a Test* class) is a callback — pytest never collects it.
# Must NOT fire (wave-2 delta evidence shape, preserved from rev 3).
def call_on_close(callback):
    callback()


def run_suite():
    def test_callback():
        pass

    call_on_close(test_callback)