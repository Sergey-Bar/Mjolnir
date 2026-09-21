using Microsoft.Playwright;
using NUnit.Framework;

public class OrderHistoryXpathTests
{
    [Test]
    public async Task XpathFindsOrderRow()
    {
        await Page.SetContentAsync("<table><tr class='order'><td>1</td></tr></table>");
        var rows = await Page.Locator("xpath=//table//tr[contains(@class, 'order')]").CountAsync();
        Assert.That(rows, Is.EqualTo(1));
    }

    [Test]
    public async Task XpathFindsNestedBadge()
    {
        await Page.SetContentAsync("<div class='order'><span class='badge'>NEW</span></div>");
        var badge = await Page.Locator("xpath=//div[@class='order']/span[@class='badge']").TextContentAsync();
        Assert.That(badge, Is.EqualTo("NEW"));
    }

    [Test]
    public async Task XpathHandlesAncestorAxis()
    {
        await Page.SetContentAsync("<ul><li class='item'><span>go</span></li></ul>");
        var li = await Page.Locator("xpath=//span[text()='go']/ancestor::li").EvaluateAsync("e => e.className");
        Assert.That(li, Is.EqualTo("item"));
    }
}
