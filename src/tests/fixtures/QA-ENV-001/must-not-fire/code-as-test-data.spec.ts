/**
 * Environment-coupling evidence lives inside string literals, so this rule
 * reads raw text. That makes code written as test DATA indistinguishable
 * from a real value unless the enclosing literal is inspected: a string
 * holding both a nested quote and call syntax is source code, not a value.
 */

describe("java rule fixtures", () => {
  it("passes navigation samples to the rule under test", () => {
    const findings = jvHardcodedUrl.run({
      path: "T.java",
      text: 'page.navigate("http://localhost:3000/checkout"); page.navigate("http://127.0.0.1:3000/checkout");',
    });
    expect(findings).toEqual([]);
  });

  it("passes an OS-path sample to the rule under test", () => {
    const findings = envRule.run({
      path: "T.java",
      text: 'Files.createFile(Paths.get("/tmp/report.json"));',
    });
    expect(findings).toEqual([]);
  });
});
