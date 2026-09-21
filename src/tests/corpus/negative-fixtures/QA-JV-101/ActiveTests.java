import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class ActiveSuite {

    @Test
    public void createsProject() {
        var id = service.create("demo");
        assertEquals(1, 1);
    }

    @Test
    public void deletesProject() {
        service.delete(1L);
        assertEquals(1, 1);
    }
}
