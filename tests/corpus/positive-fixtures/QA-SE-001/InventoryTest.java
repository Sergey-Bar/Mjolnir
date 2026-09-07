import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

class InventoryTest {
    void loadInventory(WebDriver driver) {
        driver.get("https://app.example.com/inventory");
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
        driver.findElement(By.id("inventory-table"));
    }
}
