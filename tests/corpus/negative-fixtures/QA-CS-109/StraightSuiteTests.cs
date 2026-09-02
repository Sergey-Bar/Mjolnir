using NUnit.Framework;

public class StraightSuite
{
    [Test]
    public async Task SubmitsOrder()
    {
        await Page.ClickAsync("button#submit");
    }

    [Test]
    public async Task ChargesCard()
    {
    }
}
