import org.junit.jupiter.api.Test;

class ModalTest {

    @Test
    void shouldOpenModal() {
        page.click("button#open");
        assertThat(page.getByText("Modal")).isVisible();
    }
}
