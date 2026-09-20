/**
 * Проверки целостности сборки (запуск: node tests/check-assets.mjs).
 *
 * Ловит три класса поломок, которые иначе видны только в браузере:
 *  1. файл есть на диске, но его нет в офлайн-кэше service worker;
 *  2. в кэше или в HTML указан файл, которого нет;
 *  3. ES-модуль импортирует несуществующий путь.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { ALL_ART, moduleArt, DEFAULT_ART, PENDING_ART } from '../js/data/module-art.js';
import { Shipyard } from '../js/shipyard.js';

const ROOT = resolve(import.meta.dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'tests', 'tools', 'assets']);
const ASSET_EXT = /\.(js|css|html|webmanifest|png)$/;

let failures = 0;
const check = (ok, message, extra = '') => {
  if (ok) console.log('✓', message);
  else {
    failures += 1;
    console.error('✖', message, extra);
  }
};

/** Все файлы проекта, которые браузер может запросить. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (ASSET_EXT.test(entry)) out.push(relative(ROOT, full));
  }
  return out;
}

const assets = walk(ROOT).filter(p => !p.includes('_backup') && p !== 'sw.js');
const icons = ['assets/icon-192.png', 'assets/icon-512.png'].filter(p => existsSync(join(ROOT, p)));

/* --- 1. Офлайн-кэш ------------------------------------------------------- */

const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const cached = new Set([...sw.matchAll(/'([^']+\.(?:js|css|html|webmanifest|png|jpg))'/g)].map(m => m[1]));

const notCached = [...assets, ...icons].filter(p => !cached.has(p));
check(notCached.length === 0, 'все файлы попадают в офлайн-кэш', notCached.join(', '));

const cachedButMissing = [...cached].filter(p => !existsSync(join(ROOT, p)));
check(cachedButMissing.length === 0, 'в кэше нет ссылок на удалённые файлы', cachedButMissing.join(', '));

/* --- 2. Ссылки в HTML ---------------------------------------------------- */

for (const page of assets.filter(p => p.endsWith('.html'))) {
  const html = readFileSync(join(ROOT, page), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)]
    .map(m => m[1])
    .filter(ref => !ref.startsWith('http') && !ref.startsWith('data:') && ref !== '');

  const broken = refs.filter(ref => !existsSync(resolve(ROOT, dirname(page), ref)));
  check(broken.length === 0, `ссылки в ${page} ведут на существующие файлы`, broken.join(', '));
}

/* --- 3. Импорты модулей -------------------------------------------------- */

const brokenImports = [];
for (const file of assets.filter(p => p.endsWith('.js'))) {
  const source = readFileSync(join(ROOT, file), 'utf8');
  const specs = [...source.matchAll(/(?:^|\s)(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const dynamic = [...source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);

  for (const spec of [...specs, ...dynamic]) {
    if (!spec.startsWith('.') && !spec.startsWith('/')) continue;
    const target = spec.startsWith('/')
      ? resolve(ROOT, `.${spec}`)
      : resolve(ROOT, dirname(file), spec);
    if (!existsSync(target)) brokenImports.push(`${file} → ${spec}`);
  }
}
check(brokenImports.length === 0, 'все импорты модулей разрешаются', brokenImports.join(', '));

/* --- 4. Картинки модулей ------------------------------------------------- */

const missingArt = ALL_ART.filter(path => !existsSync(join(ROOT, path)));
check(missingArt.length === 0, 'все картинки модулей лежат на диске', missingArt.join(', '));

const artNotCached = ALL_ART.filter(path => !cached.has(path));
check(artNotCached.length === 0, 'картинки модулей попадают в офлайн-кэш', artNotCached.join(', '));

// Каталог верфи — то, что игрок видит в первую очередь: запасная картинка
// там означает, что модуль добавили, а про изображение забыли.
const withoutOwnArt = new Shipyard().getCatalog()
  .filter(module => moduleArt(module) === DEFAULT_ART && !PENDING_ART.has(module.id));
check(withoutOwnArt.length === 0, 'модуль каталога либо со своей картинкой, либо в списке ожидающих', withoutOwnArt.map(m => m.id).join(', '));

// Список не должен разрастаться молча и не должен помнить исчезнувшие модули
const catalogIds = new Set(new Shipyard().getCatalog().map(module => module.id));
const stalePending = [...PENDING_ART].filter(id => !catalogIds.has(id));
check(stalePending.length === 0, 'в списке ожидающих картинку нет исчезнувших модулей', stalePending.join(', '));

// И наоборот: модуль, которому картинка уже нашлась, из списка пора убрать
const catalogById = new Map(new Shipyard().getCatalog().map(module => [module.id, module]));
const falsePending = [...PENDING_ART]
  .filter(id => catalogById.has(id) && moduleArt(catalogById.get(id)) !== DEFAULT_ART);
check(falsePending.length === 0, 'в списке ожидающих нет модулей с найденной картинкой', falsePending.join(', '));

check(moduleArt({ id: 'нет-такого' }) === DEFAULT_ART, 'незнакомый модуль получает запасную картинку');
check(moduleArt(null) === DEFAULT_ART, 'отсутствие модуля не роняет подбор картинки');

// Картинки тяжелее полумегабайта незаметно раздувают офлайн-кэш
const heavy = ALL_ART.filter(path => statSync(join(ROOT, path)).size > 200 * 1024);
check(heavy.length === 0, 'картинки модулей остаются лёгкими (до 200 КБ)', heavy.join(', '));

/* --- 5. Точки входа ------------------------------------------------------ */

const index = readFileSync(join(ROOT, 'index.html'), 'utf8');
check(index.includes('js/main.js'), 'index.html подключает точку входа');
check(index.includes('js/shell.js'), 'index.html подключает общую шапку');
check(readFileSync(join(ROOT, 'js/main.js'), 'utf8').includes("'./ui.js'"), 'точка входа подключает разделы корпорации');
check(existsSync(join(ROOT, 'manifest.webmanifest')), 'манифест PWA на месте');

console.log(failures === 0 ? '\nСборка: все проверки пройдены' : `\nСборка: проблем ${failures}`);
process.exit(failures === 0 ? 0 : 1);
