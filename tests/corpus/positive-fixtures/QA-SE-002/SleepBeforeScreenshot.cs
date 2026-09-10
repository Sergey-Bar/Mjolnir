using OpenQA.Selenium;

public class SleepBeforeScreenshot
{
    public void Capture(IWebDriver driver)
    {
        driver.Navigate().GoToUrl("https://portal.example.test/summary");
        System.Threading.Thread.Sleep(4000);
        ((ITakesScreenshot)driver).GetScreenshot();
    }
}
