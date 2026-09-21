import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.LoadState;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class DashboardNetworkIdleTest {

    @Test
    void dashboardWaitsForNetworkIdle() {
        page.navigate("/dashboard");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        assertTrue(page.locator(".widgets").isVisible());
    }

    @Test
    void reportWaitsForNetworkIdle() {
        page.navigate("/reports/weekly");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        assertEquals("weekly", page.locator("#range").textContent());
    }

    @Test
    void exportsWaitsForNetworkIdle() {
        page.navigate("/exports");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        assertNotNull(page.locator(".export-list"));
    }
}
