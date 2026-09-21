using NUnit.Framework;

public class LoginTests
{
    [Test]
    public void ShouldAcceptValidUser()
    {
        Assert.That(Login("user", "pass"), Is.True);
    }
}
