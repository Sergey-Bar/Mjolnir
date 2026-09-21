import org.junit.jupiter.api.Test;

class SelectorTest {

    @Test
    void shouldSubmitForm() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Submit")).click();
        page.getByTestId("submit-button").click();
    }
}
