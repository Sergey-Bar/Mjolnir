/**
 * Live scan progress (Terminal + CI UX Overhaul plan, M3).
 *
 * Determinism model: render-on-event, NO wall-clock timer. Frames
 * advance and lines repaint only when `onProgress` fires — testable
 * with a fake stream, no fake timers, no flaky CI.
 *
 * Stream discipline: every cursor-control ANSI sequence goes to the
 * injected stream only. The stream is gated by the caller (cli.ts
 * auto-disables on non-TTY stderr, --json/--format machine modes,
 * --no-progress, GITHUB_ACTIONS/CI env), so stdout purity and
 * byte-identical JSON are untouched by construction.
 *
 * Zero new dependencies: braille + ASCII spinner frames are inline
 * constants; erasure is plain `\r` + ESC[K.
 */

/** Spinner frames: braille, ASCII fallback. */
const BRAILLE_FRAMES = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
const ASCII_FRAMES = "|/-\\";

export type ScanPhase = "discover" | "parse" | "rules" | "score";

export interface ProgressEvent {
  phase: ScanPhase;
  done?: number | undefined;
  total?: number | undefined;
  detail?: string | undefined;
}

export interface ProgressOptions {
  /** Target stream (stderr in production; a fake in tests). */
  stream: NodeJS.WritableStream;
  /** Force ASCII frames (matches the --ascii glyph contract). */
  ascii?: boolean;
  /** TTY gate — when false the renderer is inert. */
  isTTY: boolean;
}

/** True when a live progress renderer may write to the stream at all. */
export function shouldRenderProgress(opts: {
  isTTY: boolean;
  noProgress?: boolean;
  machineFormat?: boolean;
  env?: NodeJS.ProcessEnv;
}): boolean {
  if (opts.noProgress) return false;
  if (opts.machineFormat) return false;
  if (!opts.isTTY) return false;
  const env = opts.env ?? process.env;
  if (env["GITHUB_ACTIONS"] === "true" || env["CI"] === "true") return false;
  return true;
}

const PHASE_LABELS: Record<ScanPhase, string> = {
  discover: "Discovering files",
  parse: "Parsing frameworks",
  rules: "Running rules",
  score: "Scoring",
};

/** One rendered progress line for an event and frame index. */
export function renderProgressLine(
  event: ProgressEvent,
  frameIndex: number,
  opts: { ascii?: boolean } = {},
): string {
  const frames = opts.ascii ? ASCII_FRAMES : BRAILLE_FRAMES;
  const frame = frames[frameIndex % frames.length] ?? frames[0] ?? " ";
  const label = PHASE_LABELS[event.phase];
  let line = `${frame} ${label}…`;
  const parts: string[] = [];
  if (event.total !== undefined) {
    parts.push(`${event.done ?? 0}/${event.total}`);
  }
  if (event.detail) parts.push(event.detail);
  if (parts.length > 0) line += ` (${parts.join(" · ")})`;
  return line;
}

const ERASE_TAIL = "\x1b[K";

/**
 * The event-driven progress renderer. All writes go to the injected
 * stream; the internal `lines` count tracks what must be erased when
 * the phase changes or the scan completes.
 */
export class ProgressRenderer {
  private frameIndex = 0;
  private activeLines = 0;
  private readonly stream: NodeJS.WritableStream;
  private readonly ascii: boolean;
  private readonly enabled: boolean;

  constructor(opts: ProgressOptions) {
    this.stream = opts.stream;
    this.ascii = opts.ascii === true;
    // Non-TTY gates the whole feature: nothing is ever written — not
    // even a single line — so CI logs stay clean without the caller
    // having to know this module exists.
    this.enabled = opts.isTTY;
  }

  get active(): boolean {
    return this.enabled;
  }

  /** Test-visible frame index (render-on-event determinism). */
  get frame(): number {
    return this.frameIndex;
  }

  private write(s: string): void {
    this.stream.write(s);
  }

  private erase(): void {
    if (this.activeLines > 0) {
      this.write(
        `\r\x1b[${this.activeLines}A${ERASE_TAIL}${("\n" + ERASE_TAIL).repeat(Math.max(0, this.activeLines - 1))}\r`,
      );
      this.activeLines = 0;
    }
  }

  /** Handle one onProgress event: erase, paint, advance the frame. */
  onEvent(event: ProgressEvent): void {
    if (!this.enabled) return;
    this.erase();
    const line = renderProgressLine(event, this.frameIndex, {
      ascii: this.ascii,
    });
    this.write(`${line}\n`);
    this.activeLines = 1;
    this.frameIndex++;
  }

  /** Scan finished (or formats are about to print): clear the line. */
  done(): void {
    if (!this.enabled) return;
    this.erase();
  }
}
