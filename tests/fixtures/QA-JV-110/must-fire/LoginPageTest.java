import org.junit.jupiter.api.Test;

class LoginPageTest {

    @Test
    void shouldLogIn() {
        page.navigate("/login");
        page.fill("#username", "admin");
        page.click("button#login");
    }
}
