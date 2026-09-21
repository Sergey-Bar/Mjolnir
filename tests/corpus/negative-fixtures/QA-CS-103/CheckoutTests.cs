using NUnit.Framework;

public class CheckoutTests
{
    [Test]
    public async Task SubmitsOrderWithAssertions()
    {
        await Page.ClickAsync("#submit");
        await Assertions.Expect(Page.Locator("#receipt")).ToBeVisibleAsync();
    }

    [Fact]
    public void TotalAddsUp()
    {
        var total = 2 + 2;
        Assert.That(total, Is.EqualTo(4));
    }

    [TestInitialize]
    public void SetUpBrowserState()
    {
        // setup is not a test — no assertions required
    }
}
