import org.testng.annotations.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.example.TracingExtension;

public class StraightSuite {

    @Test
    public void submitsOrder() {
    }

    @ExtendWith(TracingExtension.class)
    public void tracesCalls() {
    }
}
