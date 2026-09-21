using Microsoft.Playwright;
using NUnit.Framework;

public class NotificationsSharedContext
{
    public static readonly IPage Page = Playwright.CreateAsync().Result;
}

public class NotificationsTests
{
    [Test]
    public async Task ShowsUnreadBadge()
    {
        await NotificationsSharedContext.Page.GotoAsync("/notifications");
        await Expect(NotificationsSharedContext.Page.Locator(".unread")).ToBeVisibleAsync();
    }
}
