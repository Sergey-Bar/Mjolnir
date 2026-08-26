import org.junit.jupiter.api.Test;

class DashboardTest {

    @Test
    void shouldShowDashboard() {
        page.navigate("/dashboard");
        assertThat(page.locator("h1")).isVisible();
    }
}
