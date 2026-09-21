using Microsoft.Playwright;
using NUnit.Framework;

// Two test classes share ONE static browser/page pair — parallel test
// classes race on the same page instance.
public class SharedPlaywrightContext
{
    public static readonly IPage Page = Playwright.CreateAsync().Result;
}

public class InventoryTests
{
    [Test]
    public async Task ListsWarehouseRows() {
        await SharedPlaywrightContext.Page.GotoAsync("/inventory");
        await Expect(SharedPlaywrightContext.Page.Locator(".row")).ToHaveCountAsync(3);
    }
}

public class AuditTests
{
    [Test]
    public async Task ShowsAuditTrail() {
        await SharedPlaywrightContext.Page.GotoAsync("/audit");
        await Expect(SharedPlaywrightContext.Page.Locator(".trail")).ToBeVisibleAsync();
    }
}
