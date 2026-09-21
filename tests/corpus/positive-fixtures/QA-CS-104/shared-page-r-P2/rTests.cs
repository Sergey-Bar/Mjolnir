using Microsoft.Playwright;
using NUnit.Framework;

public class rSharedContext
{
    public static readonly IPage Page = Playwright.CreateAsync().Result;
}

public class rTests
{
    [Test]
    public async Task Page_Renders() {
        await rSharedContext.Page.GotoAsync("/r");
        await Expect(rSharedContext.Page.Locator("main")).ToBeVisibleAsync();
    }
}
