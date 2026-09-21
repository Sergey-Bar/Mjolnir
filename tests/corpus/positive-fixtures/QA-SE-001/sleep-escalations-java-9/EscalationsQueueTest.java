import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class EscalationsQueueTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/escalations/queue");
        try { Thread.sleep(2600); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("queue"));
    }
}
