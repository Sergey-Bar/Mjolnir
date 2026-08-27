import { getCodeOnlyText } from '../src/engine/ts-ast.js';
const cases = [
  'const a = `x ${w} y`, { b: 1 };',
  'const a = `plain`, { b: 1 };',
  'const a = "dq", { b: 1 };',
  'f(`a${x}b`, { k: 1 });',
  'f(`a${x}b${y}c`, { k: 1 });',
];
for (const src of cases) {
  const out = getCodeOnlyText({ path: 'p.ts', text: src });
  console.log('IN :', src);
  console.log('OUT:', out.replace(/ /g, '·'));
  console.log('     len', src.length, '->', out.length, out.length === src.length ? '' : ' *** LENGTH DRIFT ***');
  console.log();
}
