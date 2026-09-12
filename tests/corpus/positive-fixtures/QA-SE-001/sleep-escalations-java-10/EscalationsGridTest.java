import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class EscalationsGridTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/escalations/grid");
        try { Thread.sleep(2700); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("grid"));
    }
}
