import com.microsoft.playwright.*;

public class InjectedPages {

    private Page page;
    public Browser browser;
    protected BrowserContext context;
    private Playwright playwright;

    public void open() {
        page.navigate("https://example.com");
    }
}
