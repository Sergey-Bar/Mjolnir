import org.junit.jupiter.api.Test;

public class PollingSuite {

    @Test
    public void waitsForImport() throws InterruptedException {
        startImport();
        Thread.sleep(3000);
    }

    @Test
    public void waitsForExport() throws InterruptedException {
        startExport();
        Thread.sleep(5000);
    }

    @Test
    public void waitsForQueue() throws InterruptedException {
        Thread.sleep(1200);
    }
}
