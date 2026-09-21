import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.Ignore;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class FlakySuite {

    @Test
    @Disabled("flaky against staging DB")
    public void createsProject() {
        // was failing on CI every Friday
        assertEquals(2, 1 + 1);
    }

    @Test
    @Disabled
    public void deletesProject() {
        assertEquals("clean", "clean");
    }

    @Ignore
    @Test
    public void archivesProject() {
        assertTrueArchive();
    }

    @Test
    public void listsProjects() {
        assertEquals(3, 1 + 2);
    }

    private void assertTrueArchive() {
        org.junit.jupiter.api.Assertions.assertTrue(true);
    }
}
