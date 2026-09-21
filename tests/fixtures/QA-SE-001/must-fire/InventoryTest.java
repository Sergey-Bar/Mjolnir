import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

class InventoryTest {
    void loadInventory(WebDriver driver) {
        driver.get("https://app.example.com/inventory");
        Thread.sleep(3000);
        driver.findElement(By.id("inventory-table"));
        Thread.sleep(2000);
        driver.findElement(By.cssSelector("#refresh"));
    }
}
