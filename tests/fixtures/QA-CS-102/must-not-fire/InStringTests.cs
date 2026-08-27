/**
 * Phase 1 fixture: patterns inside string literals must NOT fire.
 */
public class InStringTests
{
    [Test]
    public void DocumentsAntiPattern()
    {
        string warning = "Thread.Sleep(2000) is an anti-pattern in tests";
        string example = "Task.Delay(5000) — use explicit waits instead";
        Assert.IsNotNull(warning);
        Assert.IsNotNull(example);
    }
}
