using Microsoft.Playwright;

public class InjectedPages
{
    private IPage Page;
    public IBrowser Browser;
    internal IBrowserContext Context;
    private IPlaywright Playwright;

    public void Open()
    {
        Page.GotoAsync("https://example.com");
    }
}
