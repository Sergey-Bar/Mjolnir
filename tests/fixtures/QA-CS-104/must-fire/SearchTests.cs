using Microsoft.Playwright;
using NUnit.Framework;

public class SearchTests
{
    private static IPage page;

    [Test]
    public void ShouldFindResults()
    {
        page.GotoAsync("/search?q=shoes");
    }
}
