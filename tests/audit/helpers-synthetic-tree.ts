/** Maps a synthetic field bag onto web-tree-sitter's field-name API. */
export function fieldNameOf(
  fields: Record<string, unknown>,
  name: string,
): unknown {
  return fields[name] ?? null;
}
