import org.junit.jupiter.api.Test;
import com.microsoft.playwright.options.LoadState;

class LoadTest {

    @Test
    void shouldLoadDashboard() {
        page.navigate("/dashboard");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        assertThat(page.getByText("Dashboard")).isVisible();
    }
}
