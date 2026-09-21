using Microsoft.Playwright;

public class BrowserHolderTests
{
    private static IPage Page;
    public static IBrowser Browser;
    internal static IBrowserContext Context;
    protected static IPlaywright Playwright;
    private static IPage PageTwo;

    public void Open()
    {
        Page.GotoAsync("https://example.com");
    }
}
