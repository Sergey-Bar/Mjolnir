import com.microsoft.playwright.Page;
import org.junit.jupiter.api.Test;

class SearchTest {

    private static Page page;

    @Test
    void shouldFindResults() {
        page.navigate("/search?q=shoes");
    }
}
