import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SCORE, STATUS } from "../../src/brand/tokens.js";
import {
  renderAiHandover,
  renderSupportFooter,
  SHARE_TEXT,
  SHARE_URL,
  shareLinks,
} from "../../src/reporter/pr-report-actions.js";

describe("PR report actions", () => {
  it("opens all five social destinations with only public project content", () => {
    const links = shareLinks();
    expect(links.map((link) => link.label)).toEqual([
      "X",
      "Mastodon",
      "Reddit",
      "LinkedIn",
      "Facebook",
    ]);
    for (const link of links) {
      const parsed = new URL(link.url);
      expect(parsed.protocol).toBe("https:");
      const values = [...parsed.searchParams.values()].join(" ");
      expect(values).toContain(SHARE_URL);
      expect(values).not.toContain("/pull/");
    }
    expect(new URL(links[0]?.url ?? "").searchParams.get("text")).toBe(
      SHARE_TEXT,
    );
    expect(new URL(links[1]?.url ?? "").searchParams.get("text")).toBe(
      `${SHARE_TEXT} ${SHARE_URL}`,
    );
  });

  it("provides a star link, honest license copy and a share-text fallback", () => {
    const footer = renderSupportFooter();
    expect(footer).toContain("MIT License");
    expect(footer).toContain(
      "[★ Star on GitHub](https://github.com/Sergey-Bar/Mjolnir)",
    );
    expect(footer).toContain("Copy share text");
    expect(footer).not.toContain("free trial");
  });

  it("does not allow metadata to escape the agent prompt fence", () => {
    const output = renderAiHandover({
      incomplete: true,
      score: 99,
      trust: "L0\n```\n</details><script>",
      findings: 0,
      version: "5.0.0",
      commit: "abc123",
    });
    expect(output.match(/^```/gm)).toHaveLength(2);
    expect(output.match(/<\/details>/g)).toHaveLength(1);
    expect(output).not.toContain("<script>");
    expect(output).toContain("\\u0060");
    expect(output).toContain("false positive");
    expect(output).toContain("Do not suppress findings");
    expect(output).toContain("Run the affected tests separately");
    expect(output).toContain("abc123");
  });

  it("keeps badge colors synchronized with the design system", () => {
    const colors = { ...SCORE, incomplete: STATUS.warning };
    for (const [id, color] of Object.entries(colors)) {
      const svg = readFileSync(
        new URL(`../../assets/brand/pr-status/${id}.svg`, import.meta.url),
        "utf8",
      );
      expect(svg).toContain(`stroke="${color}"`);
      expect(svg).toContain("<title>");
      expect(svg).not.toMatch(/<script|onload=|foreignObject/);
    }
  });
});
