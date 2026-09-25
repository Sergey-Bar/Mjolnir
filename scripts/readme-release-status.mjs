import { createHash } from "node:crypto";

export function renderSource(source) {
  return source
    .replace(/[\r\n\t]+/gu, " ")
    .replace(/(?:<!--[\s\S]*?-->|<[^>]+>)/gu, " ")
    .replace(/```[\s\S]*?```/gu, " ")
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

export function sourceHash(source) {
  return createHash("md5")
    .update(renderSource(source).toLowerCase())
    .digest("hex")
    .slice(0, 12);
}

function sectionBounds(source, startMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return null;
  const next = source.indexOf("\n## ", start + startMarker.length);
  return { start, end: next < 0 ? source.length : next + 1 };
}

export function extractReleaseSection(source) {
  const bounds = sectionBounds(source, "## Release status");
  if (!bounds) throw new Error("canonical release status section is missing");
  return source.slice(bounds.start, bounds.end).trim();
}

export function extractCommandRows(source) {
  const start = source.indexOf("| `mjolnir business-case`");
  const end = source.indexOf("| `mjolnir explain", start);
  if (start < 0 || end < 0)
    throw new Error("canonical command rows are missing");
  return source.slice(start, end).trim();
}

function replaceReleaseSection(translation, releaseSection) {
  const existing = sectionBounds(translation, "## Release status");
  if (existing) {
    return `${translation.slice(0, existing.start)}${releaseSection}\n\n${translation.slice(existing.end)}`;
  }
  const insertion = translation.indexOf("\n## ");
  if (insertion < 0) throw new Error("translation has no level-two section");
  return `${translation.slice(0, insertion + 1)}\n${releaseSection}\n${translation.slice(insertion + 1)}`;
}

function replaceCommandRows(translation, commandRows) {
  const start = translation.indexOf("| `mjolnir business-case`");
  const explain = translation.indexOf("| `mjolnir explain", Math.max(start, 0));
  if (start >= 0 && explain > start) {
    return `${translation.slice(0, start)}${commandRows}\n${translation.slice(explain)}`;
  }
  if (explain < 0) throw new Error("translation command table is missing");
  return `${translation.slice(0, explain)}${commandRows}\n${translation.slice(explain)}`;
}

export function syncTranslation(translation, source, syncedAt) {
  const releaseSection = `${extractReleaseSection(source).replace(
    "## Release status",
    "## Release status (English canonical)",
  )}\n\n> Machine-assisted canonical text. Translate this block before treating it as localized copy.`;
  const commandRows = extractCommandRows(source);
  const hash = sourceHash(source);
  const version = (source.match(/npx mjolnir-qa@(\d+\.\d+\.\d+)/u) ?? [])[1];
  if (!version) throw new Error("canonical package version is missing");
  let next = replaceCommandRows(translation, commandRows);
  next = replaceReleaseSection(next, releaseSection);
  next = next.replaceAll("mjolnir-qa@latest", `mjolnir-qa@${version}`);
  next = next.replaceAll("Sergey-Bar/Mjolnir@v1", "Sergey-Bar/Mjolnir@v3");
  next = next.replaceAll("@v1", "@v3").replaceAll("`v1`", "`v3`");
  next = next.replace(/\*\*Version 1\.\*\*/gu, `**Version ${version}.**`);
  next = next.replace(
    /Last synced: \d{4}-\d{2}-\d{2}/u,
    `Last synced: ${syncedAt}`,
  );
  next = next.replace(
    /Source hash: `?[0-9a-f]{12}`?/u,
    `Source hash: \`${hash}\``,
  );
  return next;
}
