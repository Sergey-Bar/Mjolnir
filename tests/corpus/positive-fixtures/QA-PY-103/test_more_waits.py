def test_report_ready(page: Page):
    page.goto("/reports")
    page.wait_for_timeout(4000)
