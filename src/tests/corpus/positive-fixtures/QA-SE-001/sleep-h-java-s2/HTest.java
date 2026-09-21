import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class HTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/h");
        try { Thread.sleep(2500); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("first-row"));
    }
}
