# detectorRevision 4 (bug-audit 3.12): a Test* class method WITH
# assertions must not fire. Must NOT fire.
class TestCheckout:
    def test_completes_with_saved_card(self):
        page.click("#checkout")
        assert page.locator(".confirmation").is_visible()