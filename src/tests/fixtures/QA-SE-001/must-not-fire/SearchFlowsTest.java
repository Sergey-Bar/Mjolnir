import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;

class SearchFlowsTest {

    private WebDriver driver;

    @Test
    void searchReturnsResults() {
        driver.get("https://shop.example.com");
        WebElement box = driver.findElement(By.id("search"));
        box.sendKeys("keyboard");
        // Explicit wait — no fixed pause, no race.
        WebElement results = new WebDriverWait(driver, Duration.ofSeconds(10))
            .until(ExpectedConditions.visibilityOfElementLocated(By.id("results")));
        org.junit.jupiter.api.Assertions.assertFalse(
            results.findElements(By.className("item")).isEmpty());
    }
}
