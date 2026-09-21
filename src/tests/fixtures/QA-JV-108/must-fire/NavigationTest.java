import org.junit.jupiter.api.Test;

class NavigationTest {

    @Test
    void shouldOpenCheckout() {
        page.navigate("https://staging.example.com/checkout");
        assertThat(page.getByText("Checkout")).isVisible();
    }
}
