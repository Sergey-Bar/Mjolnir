import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.Ignore;

public class FlakySuite {

    @Test
    @Disabled("flaky against staging DB")
    public void createsProject() {
        // was failing on CI every Friday
    }

    @Test
    @Disabled
    public void deletesProject() {
    }

    @Ignore
    @Test
    public void archivesProject() {
    }

    @Test
    public void listsProjects() {
    }
}
