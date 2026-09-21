import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;

public class SleepBeforeScreenshot {
    public void capture(WebDriver driver) throws Exception {
        driver.get("https://portal.example.test/summary");
        Thread.sleep(4000);
        ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
    }
}
