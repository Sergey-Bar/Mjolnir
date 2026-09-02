import org.testng.annotations.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junitpioneer.jupiter.RetryingTest;

public class RetrySuiteTest {

    @Test(retryAnalyzer = com.example.FlakeRetry.class)
    public void submitsOrder() {
    }

    @Test(retryAnalyzer = com.example.RetryPolicy.class)
    public void chargesCard() {
    }

    @RetryingTest(3)
    public void syncsInventory() {
    }

    @RetryingTest(5)
    public void refreshesCache() {
    }

    @ExtendWith(RetryOnFailureExtension.class)
    public void retriesFlows() {
    }

    @ExtendWith(com.example.RetryExtension.class)
    public void moreRetries() {
    }
}

    @Test(retryAnalyzer = com.example.AnotherRetry.class)
    public void refreshesCache() {
    }

    @RetryingTest(4)
    public void syncsReplicas() {
    }

    @ExtendWith(com.example.RetryOnFlake.class)
    public void retriesBackgroundJobs() {
    }

    @RetryingTest(2)
    public void retriesReplication() {
    }
}
