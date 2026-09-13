# detectorRevision 4 (bug-audit 3.12): pytest collects test_* METHODS of
# Test* classes — an assertion-less method must fire. Must fire.
class TestCheckout:
    def test_completes_with_saved_card(self):
        page.click("#checkout")