using Microsoft.Playwright;

public class SharedContextTests
{
    private static IBrowserContext ctx;
    static IPage currentPage;

    public void Navigate()
    {
        currentPage.GotoAsync("https://example.com");
    }
}
