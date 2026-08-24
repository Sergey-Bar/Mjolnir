import {resolve} from 'node:path';
const m = await import('./dist/cli.js');
const r = m.runScan({target: resolve('../empty-repo'), json: true, verbose: false, maxDurationMs: Infinity});
console.log(JSON.stringify({score: r.score, reason: r.reason, findings: r.findings.length}));
