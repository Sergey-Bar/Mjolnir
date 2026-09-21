import org.junit.jupiter.api.Test;

class NavigationTest {

    @Test
    void shouldOpenCheckout() {
        page.navigate("/checkout");
        page.navigate("http://localhost:3000/checkout");
        assertThat(page.getByText("Checkout")).isVisible();
    }
}
