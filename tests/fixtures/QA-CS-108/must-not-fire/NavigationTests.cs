using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class NavigationTests : PageTest
{
    [Test]
    public async Task ShouldOpenCheckout()
    {
        await Page.GotoAsync("/checkout");
        await Page.GotoAsync("http://localhost:3000/checkout");
        await Expect(Page.GetByText("Checkout")).ToBeVisibleAsync();
    }
}
