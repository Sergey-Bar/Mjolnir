using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class FlakyTests : PageTest
{
    [Test]
    [Retry(3)]
    public async Task ShouldSubmitOrder()
    {
        await Page.ClickAsync("button#submit");
    }
}
