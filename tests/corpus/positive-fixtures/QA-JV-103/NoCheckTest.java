import org.junit.jupiter.api.Test;

public class NoCheckSuite {

    @Test
    public void navigatesOnly() {
        page.navigate(server.EMPTY_PAGE);
    }

    @Test
    public void closesOnly() {
        page.close();
    }

    @Test
    public void setsContentOnly() {
        page.setContent("<div>yo</div>");
    }

    @Test
    public void clicksOnly() {
        page.click("#btn");
    }
}
