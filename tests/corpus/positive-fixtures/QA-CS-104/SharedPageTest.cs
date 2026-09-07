using Microsoft.Playwright;
using NUnit.Framework;

public class SharedPageTest
{
    private static readonly IPage Page = Playwright.CreateAsync().Result;

    [Test]
    public async Task ShouldRenderDashboard()
    {
        await Page.GotoAsync("https://app.example.com/dashboard");
        await Expect(Page.Locator("#dashboard")).ToBeVisibleAsync();
    }

    [Test]
    public async Task ShouldRenderSettings()
    {
        await Page.GotoAsync("https://app.example.com/settings");
        await Expect(Page.Locator("#settings")).ToBeVisibleAsync();
    }
}
