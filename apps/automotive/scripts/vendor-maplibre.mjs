// Copia a biblioteca do mapa (MapLibre GL JS) para dentro do app, como texto, para a página do
// mapa abrir sem baixar nada da internet (ver src/map/map-html.ts). Roda sozinho depois do
// `pnpm install` (postinstall) e antes de typecheck, dev e export (o pnpm pode pular o
// postinstall numa pasta já instalada). O arquivo gerado não vai para o git.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const dist = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.js'));
const version = JSON.parse(readFileSync(join(dist, '..', 'package.json'), 'utf8')).version;
const js = readFileSync(join(dist, 'maplibre-gl.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(dist, 'maplibre-gl.css'), 'utf8');
const out = join(here, '..', 'src', 'map', 'vendor');
mkdirSync(out, { recursive: true });
const target = join(out, 'maplibre.generated.ts');
const text =
  `// Gerado por scripts/vendor-maplibre.mjs (MapLibre GL JS ${version}). Não edite.\n` +
  `export const MAPLIBRE_VERSION = ${JSON.stringify(version)};\n` +
  `export const MAPLIBRE_JS = ${JSON.stringify(js)};\n` +
  `export const MAPLIBRE_CSS = ${JSON.stringify(css)};\n`;
// Igual ao que já existe: não regrava (o Expo recarregaria o app à toa).
if (existsSync(target) && readFileSync(target, 'utf8') === text) process.exit(0);
writeFileSync(target, text);
console.log(`MapLibre ${version} embutido no app (${Math.round(js.length / 1024)} KB).`);
