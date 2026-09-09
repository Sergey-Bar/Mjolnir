using OpenQA.Selenium;
using NUnit.Framework;

public class NTests
{
    [Test]
    public void Opens()
    {
        Driver.Navigate().GoToUrl("https://example.test/n");
        System.Threading.Thread.Sleep(2500);
        var row = Driver.FindElement(By.Id("first-row"));
        Assert.That(row.Displayed, Is.True);
    }
}
