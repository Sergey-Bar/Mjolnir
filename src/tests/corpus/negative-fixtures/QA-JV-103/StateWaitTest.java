import org.junit.jupiter.api.Test;

public class StateWaitTest {

    @Test
    public void elementBecomesVisible() {
        ElementHandle button = page.querySelector("#submit");
        button.waitForElementState(ElementState.VISIBLE);
    }

    @Test
    public void elementBecomesHiddenAfterRemoval() {
        page.click("#remove");
        handle.waitForElementState(ElementState.HIDDEN);
    }

    @Test
    public void elementIsEnabledBeforeClick() {
        handle.waitForElementState(ElementState.ENABLED);
        button.click();
    }

    @Test
    public void viewportMatchesProject() {
        verifyViewport(page);
        checkViewportDimensions(page, 1280, 720);
    }

    @Test
    public void a11yScanRuns() {
        var violations = new AxeBuilder(page).analyze();
        org.junit.jupiter.api.Assertions.assertNotNull(violations);
    }
}
