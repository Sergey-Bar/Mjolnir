using Microsoft.Playwright;
using NUnit.Framework;

public class eSharedContext
{
    public static readonly IPage Page = Playwright.CreateAsync().Result;
}

public class eTests
{
    [Test]
    public async Task Page_Renders() {
        await eSharedContext.Page.GotoAsync("/e");
        await Expect(eSharedContext.Page.Locator("main")).ToBeVisibleAsync();
    }
}
