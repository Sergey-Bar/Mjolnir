import org.junit.jupiter.api.Test;

class ModalTest {

    @Test
    void shouldOpenModal() {
        // A comment mentioning page.waitForTimeout(2000) must NOT fire.
        String doc = "see page.waitForTimeout(2000) usage";
        page.click("button#open");
        assertThat(page.getByText("Modal")).isVisible();
    }

    @Test
    void hasAHelperNamedWaitForTimeoutButNeverCallsIt() {
        // A method DECLARED with the name in prose-like position — the
        // lexical path would match `.waitForTimeout(` only when invoked,
        // so this pins the grammar path: no call node, no finding.
        assertThat(documentation()).isTrue();
    }

    private boolean documentation() {
        return true;
    }
}
