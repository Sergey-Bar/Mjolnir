using NUnit.Framework;

public class OrderTests
{
    [Retry(3)]
    [Test]
    public void ShouldProcessPayment()
    {
        Assert.That(PaymentGateway.Charge(100), Is.True);
    }

    [Retry(5)]
    [Test]
    public void ShouldSendConfirmationEmail()
    {
        Assert.That(Mailer.Send("user@example.com"), Is.True);
    }
}
