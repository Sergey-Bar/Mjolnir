import time
from myapp.worker import wait_for_job


def test_job_completes():
    start_job()
    time.sleep(5)
    assert job_done() is True
