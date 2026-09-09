using Microsoft.Playwright;
using NUnit.Framework;

// Consumer-side portability check: the diff helper accepts xpath
// selectors, and these tests pin the behavior on a synthetic DOM.
public class SelectorPortabilityTests
{
    [Test]
    public async Task XpathFindsNestedWidget()
    {
        await Page.SetContentAsync("<div class='panel'><span class='widget'>A</span></div>");
        var first = await Page.Locator("xpath=//span[contains(@class, 'widget')]").TextContentAsync();
        Assert.That(first, Is.EqualTo("A"));
    }

    [Test]
    public async Task XpathHandlesDeepChains()
    {
        await Page.SetContentAsync("<main><section><div class='row'><button>Go</button></div></section></main>");
        var count = await Page.Locator("xpath=//main//section//div[@class='row']/button").CountAsync();
        Assert.That(count, Is.EqualTo(1));
    }
}
