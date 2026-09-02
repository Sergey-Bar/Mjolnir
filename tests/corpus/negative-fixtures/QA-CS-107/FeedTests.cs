using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public class FeedTests
{
    [TestMethod]
    public async Task LoadsFeed()
    {
        await Page.GotoAsync("https://example.com/feed");
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        Assert.IsNotNull(Page);
    }

    [TestMethod]
    public async Task WaitsForResponse()
    {
        await Page.WaitForResponseAsync("*/api/feed*");
        Assert.IsNotNull(Page);
    }
}
