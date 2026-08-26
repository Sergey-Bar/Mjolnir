using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class FlakyTests : PageTest
{
    [Test]
    public async Task ShouldSubmitOrder()
    {
        await Page.ClickAsync("button#submit");
    }
}
