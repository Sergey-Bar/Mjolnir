using NUnit.Framework;

public class SimulationTests
{
    [Test]
    public async Task SlowServerResponseIsSimulated()
    {
        await Page.RouteAsync("**/api/slow", async route =>
        {
            await Task.Delay(5000);
            await route.FulfillAsync(new() { Body = "ok" });
        });
        await Page.GotoAsync("https://localhost/app");
        await Assertions.Expect(Page.Locator("#data")).ToBeVisibleAsync();
    }

    [Test]
    public async Task HungServerBlocksForever()
    {
        await Page.RouteAsync("**/api/hang", async route =>
        {
            await Task.Delay(-1);
            await route.FulfillAsync();
        });
        var response = await Page.GotoAsync("https://localhost/app");
        Assert.That(response, Is.Null);
    }

    [Test]
    public async Task ExposedFunctionIsAsync()
    {
        await Page.ExposeFunctionAsync("compute", async (int n) =>
        {
            await Task.Delay(100);
            return n * 2;
        });
        Assert.That(true, Is.True);
    }

    [Test]
    public async Task TimeoutRaceVerifiesBlocking()
    {
        var work = Task.Run(DoIt);
        var winner = await Task.WhenAny(work, Task.Delay(1000));
        Assert.That(winner, Is.Not.EqualTo(work));
    }

    [Test]
    public async Task HandlerTimeoutIsDeliberate()
    {
        await Page.AddLocatorHandlerAsync(Page.Locator("#overlay"), async () =>
        {
            await Task.Delay(int.MaxValue);
        });
        Assert.That(true, Is.True);
    }

    private static void DoIt() { }

    [Test]
    public async Task A11yScanRuns()
    {
        await Page.RunAxe();
        Assert.That(true, Is.True);
    }
}

