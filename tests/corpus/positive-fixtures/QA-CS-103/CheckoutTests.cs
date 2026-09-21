using NUnit.Framework;

public class CheckoutTests
{
    [Test]
    public async Task SubmitsOrderWithoutAssertions()
    {
        await Page.ClickAsync("#submit");
    }

    [Fact]
    public async Task NavigatesToHome()
    {
        await Page.GotoAsync("/home");
    }

    [TestMethod]
    public async Task OpensMenu()
    {
        await Page.ClickAsync("#menu");
    }

    [Test]
    public void ReadsConfig()
    {
        var value = System.Environment.GetEnvironmentVariable("FEATURE_FLAG");
    }
}
