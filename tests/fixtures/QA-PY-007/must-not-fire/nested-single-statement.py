# detectorRevision 5 (6.0) REGRESSION FIXTURE.
#
# A `with pytest.raises(...)` NESTED inside another `with` used to inherit
# the OUTER block's statement count, so it was scored as multi-statement and
# fired. Seven of the eleven findings adjudicated against pytest-dev/pytest at
# f9554ee5 were exactly this shape — `testing/test_capture.py` nests its
# capture assertions inside `with saved_fd(1), saved_fd(2):`, a block with a
# dozen statements. QA-PY-004 measured 75% FP because the rule was
# measuring the wrong block.
#
# Must NOT fire. The one statement IS the raise, so there is no earlier line
# that could raise the expected type by accident.
#
# The body here is deliberately long, and the enclosing `with` deliberately
# multi-statement: if block resolution regresses, the outer block's count is
# what the rule sees and this file starts firing.
import pytest
import os


def test_suspend_after_done():
    with saved_fd(1), saved_fd(2):
        os.close(1)
        cap = capture.FDCaptureBinary(1)
        cap.start()
        os.write(1, b"started")
        cap.suspend()
        os.write(1, b" resumed")
        cap.resume()
        assert cap.snap() == b"started resumed"
        cap.done()
        with pytest.raises(AssertionError):
            cap.suspend()


def test_write_after_done():
    with saved_fd(1):
        cap = capture.FDCaptureBinary(1)
        cap.start()
        cap.done()
        with pytest.raises(OSError):
            os.write(1, b"done")


def test_nested_raises_specific_type():
    with saved_fd(1), saved_fd(2):
        os.close(1)
        os.close(2)
        cap = capture.FDCaptureBinary(2)
        cap.start()
        cap.done()
        with pytest.raises(OSError):
            os.write(2, b"done")
