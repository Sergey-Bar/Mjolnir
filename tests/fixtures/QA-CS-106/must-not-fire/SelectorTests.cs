using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class SelectorTests : PageTest
{
    [Test]
    public async Task ShouldSubmitForm()
    {
        await Page.GetByRole(AriaRole.Button, new() { Name = "Submit" }).ClickAsync();
        await Page.GetByTestId("submit-button").ClickAsync();
    }
}
