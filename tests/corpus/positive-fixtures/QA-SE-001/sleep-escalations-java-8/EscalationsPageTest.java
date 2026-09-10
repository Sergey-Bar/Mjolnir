import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class EscalationsPageTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/escalations");
        try { Thread.sleep(2800); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("queue"));
    }
}
