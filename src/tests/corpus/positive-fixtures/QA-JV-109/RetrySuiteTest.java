import org.testng.annotations.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junitpioneer.jupiter.RetryingTest;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class RetrySuiteTest {

    @Test(retryAnalyzer = com.example.FlakeRetry.class)
    public void submitsOrder() {
        assertEquals(1, 1);
    }

    @Test(retryAnalyzer = com.example.RetryPolicy.class)
    public void chargesCard() {
        assertEquals(1, 1);
    }

    @RetryingTest(3)
    public void syncsInventory() {
        assertEquals(1, 1);
    }

    @RetryingTest(5)
    public void refreshesCache() {
        assertEquals(1, 1);
    }

    @ExtendWith(RetryOnFailureExtension.class)
    public void retriesFlows() {
        assertEquals(1, 1);
    }

    @ExtendWith(com.example.RetryExtension.class)
    public void moreRetries() {
        assertEquals(1, 1);
    }

    @Test(retryAnalyzer = com.example.AnotherRetry.class)
    public void refreshesCache2() {
        assertEquals(1, 1);
    }

    @RetryingTest(4)
    public void syncsReplicas() {
        assertEquals(1, 1);
    }

    @ExtendWith(com.example.RetryOnFlake.class)
    public void retriesBackgroundJobs() {
        assertEquals(1, 1);
    }

    @RetryingTest(2)
    public void retriesReplication() {
        assertEquals(1, 1);
    }
}
