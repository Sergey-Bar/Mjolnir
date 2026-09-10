import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

public class SleepBeforeLookup {
    public void openReports(WebDriver driver) {
        driver.get("https://reports.example.test/daily");
        try { Thread.sleep(3000); } catch (InterruptedException ignored) {}
        WebElement table = driver.findElement(By.id("daily-table"));
        assert table.isDisplayed();
    }
}
