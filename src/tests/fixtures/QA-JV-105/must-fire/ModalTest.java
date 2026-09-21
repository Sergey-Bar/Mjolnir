import org.junit.jupiter.api.Test;

class ModalTest {

    @Test
    void shouldOpenModal() {
        page.click("button#open");
        page.waitForTimeout(2000);
        assertThat(page.getByText("Modal")).isVisible();
    }
}
