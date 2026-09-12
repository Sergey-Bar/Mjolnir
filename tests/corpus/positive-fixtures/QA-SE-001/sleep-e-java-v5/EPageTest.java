import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class EPageTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/e");
        try { Thread.sleep(3500); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("grid"));
    }
}
