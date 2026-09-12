using System.Threading.Tasks;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class OrderFlowTests : PageTest
{
    [Test]
    public async Task ShouldLoadOrderHistory()
    {
        await Page.GotoAsync("https://app.example.com/orders");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        await Expect(Page.Locator("#order-list")).ToBeVisibleAsync();
    }

    [Test]
    public async Task ShouldLoadCustomerProfile()
    {
        await Page.GotoAsync("https://app.example.com/profile");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        await Expect(Page.Locator("#profile-card")).ToBeVisibleAsync();
    }

    [Test]
    public async Task ShouldLoadShippingAddresses()
    {
        await Page.GotoAsync("https://app.example.com/addresses");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        await Expect(Page.Locator(".address-row")).ToBeVisibleAsync();
    }
}
