using Deque.AxeCore.Playwright;
using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class LoginPageTests : PageTest
{
    [Test]
    public async Task ShouldLogIn()
    {
        await Page.GotoAsync("/login");
        await Page.FillAsync("#username", "admin");
        await Page.ClickAsync("button#login");

        var axeResults = await Page.RunAxe();
        Assert.That(axeResults.Violations, Is.Empty);
    }
}
