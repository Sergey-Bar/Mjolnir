using Microsoft.Playwright;
using Microsoft.Playwright.MSTest;

[TestClass]
public class FeedTests
{
    [TestMethod]
    public async Task LoadsFeed()
    {
        await Page.GotoAsync("https://example.com/feed");
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
    }

    [TestMethod]
    public async Task WaitsForResponse()
    {
        await Page.WaitForResponseAsync("*/api/feed*");
    }
}
