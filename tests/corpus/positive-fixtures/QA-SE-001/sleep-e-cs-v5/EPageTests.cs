using OpenQA.Selenium;
using NUnit.Framework;

public class EPageTests
{
    [Test]
    public void Opens()
    {
        Driver.Navigate().GoToUrl("https://example.test/e");
        System.Threading.Thread.Sleep(3500);
        Driver.FindElement(By.Id("grid"));
    }
}
