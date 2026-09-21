using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class NavigationTests : PageTest
{
    [Test]
    public async Task ShouldOpenCheckout()
    {
        await Page.GotoAsync("https://staging.example.com/checkout");
        await Expect(Page.GetByText("Checkout")).ToBeVisibleAsync();
    }
}
