import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;
import org.junit.jupiter.api.Test;

public class FeedTests {

    @Test
    public void loadsFeed(Page page) {
        page.navigate("https://example.com/feed");
        page.waitForLoadState(LoadState.NETWORKIDLE);
    }

    @Test
    public void loadsTimeline(Page page) {
        page.waitForLoadState(LoadState.NETWORKIDLE);
    }

    @Test
    public void loadsInbox(Page page) {
        page.waitForLoadState(LoadState.NETWORKIDLE);
    }

    @Test
    public void loadsArchive(Page page) {
        page.waitForLoadState(LoadState.NETWORKIDLE);
    }
}
