import org.junit.jupiter.api.Test;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.LoadState;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

class OrderFlowTest {

    @Test
    void shouldLoadOrderHistory(Page page) {
        page.navigate("https://app.example.com/orders");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        assertThat(page.locator("#order-list")).isVisible();
    }

    @Test
    void shouldLoadCustomerProfile(Page page) {
        page.navigate("https://app.example.com/profile");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        assertThat(page.locator("#profile-card")).isVisible();
    }

    @Test
    void shouldLoadShippingAddresses(Page page) {
        page.navigate("https://app.example.com/addresses");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        assertThat(page.locator(".address-row")).isVisible();
    }
}
