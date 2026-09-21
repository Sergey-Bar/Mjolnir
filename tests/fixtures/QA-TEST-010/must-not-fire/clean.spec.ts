describe("checkout", () => {
  it("completes the order", () => {
    expect(order.status).toBe("complete");
  });
});

// Bug-audit 2026-08-31 (astro corpus): the leading comment's text ends in
// `})`, and the regex consumed the comment CONTENT as structure — real
// comment-leading bodies were flagged as empty. The comment is part of the
// match; only whitespace and comments may sit between `{` and `}`.
it("comment leads a real body", () => {
  // Case 2: checkout returns new Response(null, { status: 404 })
  const res = checkout();
  expect(res.status).toBe(404);
});
