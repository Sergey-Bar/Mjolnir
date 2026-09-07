import org.junit.jupiter.api.Test;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.LoadState;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

class InventoryTest {

    @Test
    void shouldRenderInventory(Page page) {
        page.navigate("https://app.example.com/inventory");
        page.waitForLoadState(LoadState.LOAD);
        assertThat(page.locator("#inventory-table")).isVisible();
    }

    @Test
    void shouldRenderAdminPanel(Page page) {
        page.navigate("https://app.example.com/admin");
        page.waitForLoadState(LoadState.LOAD);
        assertThat(page.locator("#admin-panel")).isVisible();
    }
}
