import com.deque.html.axecore.playwright.AxeBuilder;
import com.deque.html.axecore.utility.axeresults.AxeResults;
import org.junit.jupiter.api.Test;

class LoginPageTest {

    @Test
    void shouldLogIn() {
        page.navigate("/login");
        page.fill("#username", "admin");
        page.click("button#login");

        AxeResults axeResults = new AxeBuilder(page).analyze();
        assertTrue(axeResults.violationFree());
    }
}
