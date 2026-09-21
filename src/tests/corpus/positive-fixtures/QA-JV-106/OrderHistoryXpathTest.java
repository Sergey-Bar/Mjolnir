import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class OrderHistoryXpathTest {

    @Test
    void xpathFindsOrderRow() {
        page.setContent("<table><tr class='order'><td>1</td></tr></table>");
        Integer rows = (Integer) page.locator("xpath=//table//tr[contains(@class, 'order')]").count();
        assertEquals(1, rows);
    }

    @Test
    void xpathFindsNestedBadge() {
        page.setContent("<div class='order'><span class='badge'>NEW</span></div>");
        String badge = page.locator("xpath=//div[@class='order']/span[@class='badge']").textContent();
        assertEquals("NEW", badge);
    }

    @Test
    void xpathHandlesAncestorAxis() {
        page.setContent("<ul><li class='item'><span>go</span></li></ul>");
        Object li = page.locator("xpath=//span[text()='go']/ancestor::li").evaluate("e => e.className");
        assertEquals("item", li);
    }

    @Test
    void xpathHandlesPositionalPredicate() {
        page.setContent("<div><p>one</p><p>two</p></div>");
        String second = page.locator("xpath=//div/p[position()=2]").textContent();
        assertEquals("two", second);
    }
}
