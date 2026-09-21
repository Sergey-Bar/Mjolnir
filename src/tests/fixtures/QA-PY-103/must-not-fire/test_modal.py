def test_modal_opens(page):
    page.click("button#open")
    expect(page.get_by_text("Modal")).to_be_visible()
