import org.junit.jupiter.api.Test;
import com.microsoft.playwright.Page;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

class InventoryTest {

    @Test
    void shouldRenderInventory(Page page) {
        page.navigate("https://app.example.com/inventory");
        var row = page.locator("xpath=//table[@id='inventory']/tr[3]");
        assertThat(row).isVisible();
    }

    @Test
    void shouldRenderNestedPanel(Page page) {
        page.navigate("https://app.example.com/admin");
        var panel = page.locator("//html/body/div[2]/div/section");
        assertThat(panel).isVisible();
    }

    @Test
    void shouldRenderPrices(Page page) {
        page.navigate("https://app.example.com/prices");
        var child = page.locator("div:nth-child(4) > span.price");
        assertThat(child).isVisible();
    }
}
