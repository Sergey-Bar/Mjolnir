using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class RouteTests : PageTest
{
    [Test]
    public async Task ShouldMockApi()
    {
        await Page.RouteAsync("**/api/orders", route => route.FulfillAsync());
    }
}
