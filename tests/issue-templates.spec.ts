/**
 * GitHub issue template validity (Master-Stabilization-Plan Sprint 4,
 * Task 17). Not a full render against GitHub's own UI (that requires
 * the real repo), but the checks that are locally verifiable: valid
 * YAML, GitHub's required issue-form fields present, and every
 * template referenced by config.yml (implicitly, by existing in the
 * directory) is well-formed.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const TEMPLATE_DIR = join(
  import.meta.dirname,
  "..",
  ".github",
  "ISSUE_TEMPLATE",
);

interface IssueForm {
  name: string;
  description: string;
  title?: string;
  labels?: string[];
  body: Array<{
    type: string;
    id?: string;
    attributes: Record<string, unknown>;
  }>;
}

function loadTemplates(): Array<{ file: string; doc: IssueForm }> {
  const files = readdirSync(TEMPLATE_DIR).filter(
    (f) => f.endsWith(".yml") && f !== "config.yml",
  );
  return files.map((file) => ({
    file,
    doc: parse(readFileSync(join(TEMPLATE_DIR, file), "utf8")) as IssueForm,
  }));
}

describe("GitHub issue templates", () => {
  it("the four required templates exist (bug, false-positive, rule-request, language-request)", () => {
    const files = readdirSync(TEMPLATE_DIR);
    for (const expected of [
      "bug-report.yml",
      "false-positive.yml",
      "rule-request.yml",
      "language-request.yml",
    ]) {
      expect(files).toContain(expected);
    }
  });

  it("config.yml is valid YAML and disables blank issues", () => {
    const config = parse(
      readFileSync(join(TEMPLATE_DIR, "config.yml"), "utf8"),
    ) as { blank_issues_enabled?: boolean };
    expect(config.blank_issues_enabled).toBe(false);
  });

  const templates = loadTemplates();

  it("found templates to check (sanity)", () => {
    expect(templates.length).toBeGreaterThanOrEqual(4);
  });

  it.each(templates.map((t) => t.file))(
    "%s parses as valid YAML with GitHub's required issue-form fields",
    (file) => {
      const found = templates.find((t) => t.file === file);
      if (!found) throw new Error(`template ${file} not found in loaded set`);
      const { doc } = found;
      expect(doc.name, `${file} is missing "name"`).toBeTruthy();
      expect(doc.description, `${file} is missing "description"`).toBeTruthy();
      expect(
        Array.isArray(doc.body) && doc.body.length > 0,
        `${file} is missing a non-empty "body" array`,
      ).toBe(true);
    },
  );

  it.each(templates.map((t) => t.file))(
    "%s: every body element has a valid type and (where required) an id",
    (file) => {
      const found = templates.find((t) => t.file === file);
      if (!found) throw new Error(`template ${file} not found in loaded set`);
      const { doc } = found;
      const validTypes = new Set([
        "markdown",
        "input",
        "textarea",
        "dropdown",
        "checkboxes",
      ]);
      for (const el of doc.body) {
        expect(
          validTypes.has(el.type),
          `${file} has a body element with unknown type "${el.type}"`,
        ).toBe(true);
        if (el.type !== "markdown") {
          expect(
            el.id,
            `${file}'s "${el.type}" element (attributes.label="${String((el.attributes as { label?: string }).label)}") is missing an "id"`,
          ).toBeTruthy();
        }
      }
    },
  );

  it("false-positive.yml requires a rule ID field", () => {
    const found = templates.find((t) => t.file === "false-positive.yml");
    if (!found) throw new Error("false-positive.yml not found in loaded set");
    const ruleIdField = found.doc.body.find((el) => el.id === "rule-id");
    expect(ruleIdField).toBeDefined();
  });
});
