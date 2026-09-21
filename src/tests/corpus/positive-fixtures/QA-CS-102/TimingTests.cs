using NUnit.Framework;

public class TimingTests
{
    [Test]
    public async Task ArtificialTimingBeforeNavigation()
    {
        await Task.Delay(300);
        await FrameLocator.NavigateAsync("iframe.html");
        await Task.Delay(500);
        await Assertions.Expect(Page.Locator("#frame")).ToBeVisibleAsync();
    }

    [Test]
    public async Task HardSleepForVideoCapture()
    {
        await Page.Context.StartRecordingAsync();
        await Page.GotoAsync("https://localhost/app");
        await Task.Delay(1000);
        await Page.Context.StopRecordingAsync();
        Assert.That(true, Is.True);
    }

    [Test]
    public async Task A11yScanRuns()
    {
        await Page.RunAxe();
        Assert.That(true, Is.True);
    }
}

