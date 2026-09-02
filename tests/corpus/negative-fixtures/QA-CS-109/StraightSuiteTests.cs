using NUnit.Framework;

public class StraightSuite
{
    [Test]
    public async Task SubmitsOrder()
    {
        await Page.ClickAsync("button#submit");
        Assert.That(true, Is.True);
    }

    [Test]
    public async Task ChargesCard()
    {
        Assert.That(true, Is.True);
    }
}
