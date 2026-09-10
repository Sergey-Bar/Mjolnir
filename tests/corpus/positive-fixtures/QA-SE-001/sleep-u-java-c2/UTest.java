import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class UTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/u");
        try { Thread.sleep(2500); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("first-row"));
    }
}
