using System.Threading.Tasks;
using Microsoft.Playwright;
using NUnit.Framework;

public class InventoryTests
{
    [Test]
    public async Task ShouldRenderInventory(Page page)
    {
        await page.GotoAsync("https://app.example.com/inventory");
        var row = page.Locator("xpath=//table[@id='inventory']/tr[3]");
        await Expect(row).ToBeVisibleAsync();
    }

    [Test]
    public async Task ShouldRenderNestedPanel(Page page)
    {
        await page.GotoAsync("https://app.example.com/admin");
        var panel = page.Locator("//html/body/div[2]/div/section");
        await Expect(panel).ToBeVisibleAsync();
    }

    [Test]
    public async Task ShouldRenderPrices(Page page)
    {
        await page.GotoAsync("https://app.example.com/prices");
        var child = page.Locator("div:nth-child(4) > span.price");
        Assert.That(child.CountAsync().Result, Is.GreaterThan(0));
    }
}
