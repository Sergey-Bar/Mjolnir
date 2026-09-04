import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class PollingSuite {

    @Test
    public void waitsForImport() throws InterruptedException {
        startImport();
        Thread.sleep(3000);
        assertEquals(true, pollDone);
    }

    @Test
    public void waitsForExport() throws InterruptedException {
        startExport();
        Thread.sleep(5000);
        assertEquals(true, pollDone);
    }

    @Test
    public void waitsForQueue() throws InterruptedException {
        Thread.sleep(1200);
        assertEquals(true, pollDone);
    }

    private boolean pollDone = false;
    private void startImport() { }
    private void startExport() { }
}
