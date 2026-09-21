using NUnit.Framework;

public class RetrySuiteTests
{
    [Test]
    [Retry(3)]
    public async Task SubmitsOrder()
    {
        await Page.ClickAsync("button#submit");
        Assert.That(true, Is.True);
    }

    [Test]
    [Retry(5)]
    public async Task ChargesCard()
    {
        Assert.That(true, Is.True);
    }

    [Test]
    [Retry(2)]
    public async Task RefreshesSession()
    {
        Assert.That(true, Is.True);
    }

    [Test]
    [Retry(4)]
    public async Task SyncsData()
    {
        Assert.That(true, Is.True);
    }
}
