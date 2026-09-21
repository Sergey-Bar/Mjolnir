import com.microsoft.playwright.*;

public class SharedContextTest {

    private static BrowserContext ctx;
    static Page currentPage;

    public void navigate() {
        currentPage.navigate("https://example.com");
    }
}
