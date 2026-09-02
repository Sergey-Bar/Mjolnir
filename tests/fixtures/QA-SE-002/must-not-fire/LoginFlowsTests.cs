using System;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;

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
        // Explicit wait — no fixed pause, no race.
        var header = new WebDriverWait(driver, TimeSpan.FromSeconds(10))
            .Until(d => d.FindElement(By.Id("dashboard-header")));
        Assert.That(header.Text, Is.EqualTo("Welcome"));
    }
}
