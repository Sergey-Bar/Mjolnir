def test_modal_opens(page):
    page.click("button#open")
    page.wait_for_timeout(2000)
    assert page.get_by_text("Modal").is_visible()
