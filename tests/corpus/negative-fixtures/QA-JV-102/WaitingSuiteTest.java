import java.time.Duration;

import org.junit.jupiter.api.Test;

public class WaitingSuite {

    @Test
    public void waitsForImport() {
        importService.awaitCompletion(Duration.ofSeconds(5));
    }

    @Test
    public void explicitLatch() throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(1);
        startImport(latch);
        latch.await();
    }
}
