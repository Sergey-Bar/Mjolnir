import org.testng.annotations.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.example.TracingExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class StraightSuite {

    @Test
    public void submitsOrder() {
        assertEquals(1, 1);
    }

    @ExtendWith(TracingExtension.class)
    public void tracesCalls() {
        assertEquals(1, 1);
    }
}
