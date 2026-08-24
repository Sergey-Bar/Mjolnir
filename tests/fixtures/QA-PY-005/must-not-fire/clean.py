from myapp.worker import wait_for_job


def test_job_completes():
    start_job()
    assert wait_for_job(timeout=10) is True
