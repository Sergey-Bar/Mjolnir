using NUnit.Framework;
using Shouldly;

public class MarkupSuite
{
    [Test]
    public void ParsesBoldMarkup()
    {
        var ex = Record.Exception(() => Markup.Parse("**bold**"));
        ex.ShouldBeOfType<InvalidOperationException>().Message.ShouldBe("markup");
    }

    [Test]
    public void RendersEscapedText()
    {
        fixture.Output.ShouldBe("literal [text]");
    }

    [Test]
    public void RejectsUnbalancedBrackets()
    {
        Should.Throw<InvalidOperationException>(() => Markup.Parse("[[")).Message.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public void WritesAnsiSequence()
    {
        writer.Output.ShouldContain("\x1b[1m");
        writer.Output.ShouldNotBeNullOrWhiteSpace();
    }

    [Test]
    public void VerifiesRepositoryWrites()
    {
        store.Verify(x => x.Save(doc));
        store.VerifyAll();
    }
}
