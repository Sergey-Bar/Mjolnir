using System.Threading.Tasks;
using Microsoft.Playwright;
using NUnit.Framework;

public class InventoryTests
{
    [Test]
    public async Task ShouldRenderInventory(Page page)
    {
        await page.GotoAsync("https://app.example.com/inventory");
        var row = page.GetByRole(AriaRole.Row, new() { Name = "premium" });
        await Expect(row).ToBeVisibleAsync();
    }

    [Test]
    public async Task ShouldRenderPrices(Page page)
    {
        await page.GotoAsync("https://app.example.com/prices");
        var child = page.GetByTestId("price");
        Assert.That(child.CountAsync().Result, Is.GreaterThan(0));
    }
}
