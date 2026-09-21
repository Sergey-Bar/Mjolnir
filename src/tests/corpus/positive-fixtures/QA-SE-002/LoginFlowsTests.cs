using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;

public class LoginFlowsTests
{
    private IWebDriver driver;

    [Test]
    public void LoginShowsDashboard()
    {
        driver.Navigate().GoToUrl("https://app.example.com/login");
        driver.FindElement(By.Id("user")).SendKeys("admin");
        driver.FindElement(By.Id("pass")).SendKeys("secret");
        driver.FindElement(By.Id("submit")).Click();
        // Fixed pause before reading the dashboard header.
        System.Threading.Thread.Sleep(3000);
        var header = driver.FindElement(By.Id("dashboard-header"));
        Assert.That(header.Text, Is.EqualTo("Welcome"));
    }
}
