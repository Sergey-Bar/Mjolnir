import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class WaitingSuite {

    @Test
    public void waitsForImport() {
        startImport();
        waitForCondition();
        assertEquals(true, importDone);
    }

    @Test
    public void waitsForExport() {
        startExport();
        waitForCondition();
        assertEquals(true, exportDone);
    }

    private boolean importDone;
    private boolean exportDone;
    private void startImport() { }
    private void startExport() { }
    private void waitForCondition() { }
}
