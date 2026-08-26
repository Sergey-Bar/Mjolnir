import org.testng.annotations.Test;

class FlakyTest {

    @Test(retryAnalyzer = FlakyRetry.class)
    void shouldSubmitOrder() {
        page.click("button#submit");
    }
}
