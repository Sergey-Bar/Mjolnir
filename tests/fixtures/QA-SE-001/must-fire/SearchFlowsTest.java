import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;

class SearchFlowsTest {

    private WebDriver driver;

    @Test
    void searchReturnsResults() throws InterruptedException {
        driver.get("https://shop.example.com");
        WebElement box = driver.findElement(By.id("search"));
        box.sendKeys("keyboard");
        // Fixed pause before reading the results grid.
        Thread.sleep(2000);
        WebElement results = driver.findElement(By.id("results"));
        org.junit.jupiter.api.Assertions.assertFalse(
            results.findElements(By.className("item")).isEmpty());
    }
}
