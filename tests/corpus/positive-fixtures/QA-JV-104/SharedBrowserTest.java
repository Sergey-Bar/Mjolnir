import com.microsoft.playwright.*;

public class SharedBrowserTest {

    private static Page page;
    public static Browser browser;
    protected static BrowserContext context;
    static Playwright playwright;
    private static Page pageTwo;
    public static Browser browserTwo;

    public void open() {
        page.navigate("https://example.com");
    }
}
