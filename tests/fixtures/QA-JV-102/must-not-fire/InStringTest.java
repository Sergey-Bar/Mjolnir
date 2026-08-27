/**
 * Phase 1 fixture: patterns inside string literals must NOT fire.
 */
public class InStringTest {
    @Test
    public void documentsAntiPattern() {
        String warning = "Thread.sleep(2000) is an anti-pattern in tests";
        String example = "Avoid TimeUnit.SECONDS.sleep(5) — use WebDriverWait";
        assertNotNull(warning);
        assertNotNull(example);
    }
}
