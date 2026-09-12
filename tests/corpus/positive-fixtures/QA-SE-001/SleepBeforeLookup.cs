using OpenQA.Selenium;

public class SleepBeforeLookup
{
    public void OpenReports(IWebDriver driver)
    {
        driver.Navigate().GoToUrl("https://reports.example.test/daily");
        Thread.Sleep(3000);
        var table = driver.FindElement(By.Id("daily-table"));
        Assert.IsTrue(table.Displayed);
    }
}
