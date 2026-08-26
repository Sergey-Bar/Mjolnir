using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class LoadTests : PageTest
{
    [Test]
    public async Task ShouldLoadDashboard()
    {
        await Page.GotoAsync("/dashboard");
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await Expect(Page.GetByText("Dashboard")).ToBeVisibleAsync();
    }
}
