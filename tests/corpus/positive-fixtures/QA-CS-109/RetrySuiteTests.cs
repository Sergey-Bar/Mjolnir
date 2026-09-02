using NUnit.Framework;
using RetryPolicy;

public class RetrySuiteTests
{
    [Test]
    [Retry(3)]
    public async Task SubmitsOrder()
    {
        await Page.ClickAsync("button#submit");
    }

    [Test]
    [Retry(5)]
    public async Task ChargesCard()
    {
    }

    [Test]
    [Retry(2)]
    public async Task RefreshesSession()
    {
    }

    [Test]
    [Retry(4)]
    public async Task SyncsData()
    {
    }
}
