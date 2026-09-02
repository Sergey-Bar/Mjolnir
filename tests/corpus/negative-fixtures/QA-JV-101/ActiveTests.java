import org.junit.jupiter.api.Test;

public class ActiveSuite {

    @Test
    public void createsProject() {
        var id = service.create("demo");
    }

    @Test
    public void deletesProject() {
        service.delete(1L);
    }
}
