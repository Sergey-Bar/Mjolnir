import org.junit.jupiter.api.Test;

class DashboardTest {

    @Test
    void shouldShowDashboard() {
        page.navigate("/dashboard");
        Thread.sleep(3000);
        assertThat(page.locator("h1")).isVisible();
    }
}
