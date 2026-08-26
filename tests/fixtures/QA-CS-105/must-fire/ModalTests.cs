using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class ModalTests : PageTest
{
    [Test]
    public async Task ShouldOpenModal()
    {
        await Page.ClickAsync("button#open");
        await Page.WaitForTimeoutAsync(2000);
        await Expect(Page.GetByText("Modal")).ToBeVisibleAsync();
    }
}
