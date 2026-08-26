import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginTest {

    @Test
    void shouldAcceptValidUser() {
        assertTrue(login("user", "pass"));
    }
}
