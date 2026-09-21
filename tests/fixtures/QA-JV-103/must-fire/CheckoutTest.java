import org.junit.jupiter.api.Test;

class CheckoutTest {

    @Test
    void shouldCompleteCheckout() {
        page.click("#checkout");
        page.fill("#address", "Main st 1");
    }
}
