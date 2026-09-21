import org.testng.annotations.Test;

class FlakyTest {

    @Test
    void shouldSubmitOrder() {
        page.click("button#submit");
    }
}
