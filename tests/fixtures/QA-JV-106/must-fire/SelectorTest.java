import org.junit.jupiter.api.Test;

class SelectorTest {

    @Test
    void shouldSubmitForm() {
        page.locator("xpath=//button[@type='submit']").click();
        page.locator("//div/section/form").click();
        page.querySelector("#submit-button");
    }
}
