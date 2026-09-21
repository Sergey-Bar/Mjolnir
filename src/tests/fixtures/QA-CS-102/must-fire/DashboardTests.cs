using NUnit.Framework;

public class DashboardTests
{
    [Test]
    public async Task ShouldShowDashboard()
    {
        await page.GotoAsync("/dashboard");
        Thread.Sleep(3000);
        await Assertions.Expect(page.Locator("h1")).ToBeVisibleAsync();
    }
}
