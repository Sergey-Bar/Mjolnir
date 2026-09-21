using Xunit;

public class CheckoutTests
{
    [Fact]
    public async Task ShouldCompleteCheckout()
    {
        await page.ClickAsync("#checkout");
        await page.FillAsync("#address", "Main st 1");
        Assert.Contains("confirm", page.Url);
    }
}
