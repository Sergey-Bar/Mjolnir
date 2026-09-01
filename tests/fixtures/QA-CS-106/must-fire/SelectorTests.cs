using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class SelectorTests : PageTest
{
    [Test]
    public async Task ShouldSubmitForm()
    {
        await Page.Locator("xpath=//button[@type='submit']").ClickAsync();
        await Page.Locator("//div/section/form").ClickAsync();
    }
}
