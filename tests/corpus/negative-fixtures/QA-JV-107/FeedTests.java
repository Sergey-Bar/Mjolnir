import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;
import org.junit.jupiter.api.Test;

public class FeedTests {

    @Test
    public void loadsFeed(Page page) {
        page.navigate("https://example.com/feed");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
    }

    @Test
    public void waitsForResponse(Page page) {
        page.waitForResponse(url -> url.contains("/api/feed"));
    }
}
