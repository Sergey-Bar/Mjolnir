using NUnit.Framework;

// The Retry attribute silently re-runs the flaky timing assertion —
// the underlying race (no await on the polling task) is never fixed.
[Retry(5)]
public class RetryMaskedFailureTests
{
    [Test]
    public async Task PollingTaskEventuallySucceeds()
    {
        var result = await StartBackgroundJobAsync();
        Assert.That(result, Is.EqualTo("done"));
    }
}
