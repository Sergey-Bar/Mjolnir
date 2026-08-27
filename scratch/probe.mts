import { readFileSync } from 'node:fs';
import { computeCodeText } from '../src/engine/code-text.js';
const p = 'tests/registry-install.spec.ts';
const text = readFileSync(p, 'utf8');
const code = computeCodeText({ path: p, text }, 'typescript');
const lineAt = (t: string, i: number) => t.slice(0, i).split('\n').length;
for (const [label, t] of [['RAW ', text], ['CODE', code]] as const) {
  const hookRe = /\b(?:beforeEach|beforeAll|afterEach|afterAll)\s*\(\s*(?:async\s*)?\(/g;
  let h: RegExpExecArray | null;
  while ((h = hookRe.exec(t)) !== null) {
    const open = t.indexOf('{', h.index + h[0].length - 1);
    let depth = 0, end = open;
    for (let i = open; i < t.length; i++) {
      if (t[i] === '{') depth++;
      else if (t[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    console.log(`${label} hook@line ${lineAt(t,h.index)} -> body lines ${lineAt(t,open)}..${lineAt(t,end)}`);
  }
}
console.log('\n--- codeText view, lines 52-56 ---');
console.log(code.split('\n').slice(51,56).map((l,i)=>(52+i)+'| '+l).join('\n'));
