using Microsoft.Playwright.NUnit;
using NUnit.Framework;

public class ModalTests : PageTest
{
    [Test]
    public async Task ShouldOpenModal()
    {
        // A comment mentioning Page.WaitForTimeoutAsync(2000) must NOT fire.
        string doc = "see Page.WaitForTimeoutAsync(2000) usage";
        await Page.ClickAsync("button#open");
        await Expect(Page.GetByText("Modal")).ToBeVisibleAsync();
    }

    [Test]
    public void WaitForTimeoutAsyncIsOnlyMentionedInProse()
    {
        // The helper METHOD below is the FIX (an auto-waiting waitFor),
        // not a sleep — the lexical path could not tell declarations from
        // calls; the grammar path sees no invocation_expression.
        Assert.That(typeof(PageTest).Name, Is.Not.Empty);
    }
}
