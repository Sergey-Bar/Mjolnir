import org.junit.jupiter.api.Test;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

class CheckoutTest {

    @Test
    void shouldCompleteCheckout() {
        page.click("#checkout");
        page.fill("#address", "Main st 1");
        assertThat(page).hasURL("**/order/confirm");
    }
}
