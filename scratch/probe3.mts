import { getCodeOnlyText } from '../src/engine/ts-ast.js';
const cases = [
  'f(`a "${w}" b`, { k: 1 });',
  'f(`a "${w}" b`, { k: 1 });\nconst z = 2;\nlet q = 3;',
  "f(`a '${w}' b`, { k: 1 });",
  'f(`no quotes ${w} here`, { k: 1 });',
];
for (const src of cases) {
  const out = getCodeOnlyText({ path: 'p.ts', text: src });
  console.log('IN :', JSON.stringify(src));
  console.log('OUT:', JSON.stringify(out.replace(/ /g, '.')));
  console.log();
}
