using OpenQA.Selenium;
using NUnit.Framework;

public class EscalationsPageTests
{
    [Test]
    public void Opens()
    {
        Driver.Navigate().GoToUrl("https://example.test/escalations");
        System.Threading.Thread.Sleep(2800);
        Driver.FindElement(By.Id("queue"));
    }
}
