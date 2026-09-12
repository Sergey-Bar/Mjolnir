import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

// Consumer-side portability check for a screenshot-diff helper: the
// helper accepts both css and xpath selectors, and these tests pin the
// xpath behavior on a synthetic DOM.
class SelectorPortabilityTest {

    @Test
    void xpathFindsNestedWidget() {
        page.setContent("<div class='panel'><span class='widget'>A</span></div>");
        Object first = page.locator("xpath=//span[contains(@class, 'widget')]").evaluate("e => e.textContent");
        assertEquals("A", first);
    }

    @Test
    void xpathHandlesDeepChains() {
        page.setContent("<main><section><div class='row'><button>Go</button></div></section></main>");
        Integer count = (Integer) page.locator("xpath=//main//section//div[@class='row']/button").count();
        assertEquals(1, count);
    }
}
