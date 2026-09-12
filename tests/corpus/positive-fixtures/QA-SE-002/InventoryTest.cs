using System.Threading;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;

class InventoryTest
{
    public void LoadInventory(IWebDriver driver)
    {
        driver.Navigate().GoToUrl("https://app.example.com/inventory");
        Thread.Sleep(3000);
        driver.FindElement(By.Id("inventory-table"));
    }
}
