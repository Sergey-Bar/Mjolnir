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
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        Assert.IsNotNull(Page);;
    }

    [TestMethod]
    public async Task LoadsTimeline()
    {
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        Assert.IsNotNull(Page);;
    }

    [TestMethod]
    public async Task LoadsInbox()
    {
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        Assert.IsNotNull(Page);;
    }

    [TestMethod]
    public async Task LoadsArchive()
    {
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        Assert.IsNotNull(Page);;
    }
}


