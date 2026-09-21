using OpenQA.Selenium;
using NUnit.Framework;

public class IPageTests
{
    [Test]
    public void Opens()
    {
        Driver.Navigate().GoToUrl("https://example.test/i");
        System.Threading.Thread.Sleep(3500);
        Driver.FindElement(By.Id("grid"));
    }
}
