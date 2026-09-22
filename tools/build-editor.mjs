import { build } from 'esbuild';
import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
await mkdir('vendor', { recursive: true });
await build({
  entryPoints: { editor: 'tools/editor-entry.js', 'editor.worker': 'node_modules/monaco-editor/esm/vs/editor/editor.worker.js', 'ts.worker': 'node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js' },
  outdir: 'vendor', bundle: true, format: 'esm', minify: true,
  loader: { '.ttf': 'file' }, assetNames: '[name]', legalComments: 'linked',
});
await copyFile('node_modules/monaco-editor/LICENSE', 'vendor/MONACO-LICENSE.txt');
const files = (await readdir('vendor')).sort();
const list = files.map(name => `  'vendor/${name}',`).join('\n');
const sw = await readFile('sw.js','utf8');
await writeFile('sw.js',sw.replace(/  \/\/ editor-assets-start[\s\S]*?  \/\/ editor-assets-end/,`  // editor-assets-start\n${list}\n  // editor-assets-end`));
console.log(`Editor built: ${files.length} local assets`);
