// Copia a biblioteca do mapa (MapLibre GL JS) para dentro do app, como texto, para a página do
// mapa abrir sem baixar nada da internet (ver src/map/map-html.ts). Roda sozinho depois do
// `pnpm install` (postinstall). O arquivo gerado não vai para o git.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
writeFileSync(
  join(out, 'maplibre.generated.ts'),
  `// Gerado por scripts/vendor-maplibre.mjs (MapLibre GL JS ${version}). Não edite.\n` +
    `export const MAPLIBRE_VERSION = ${JSON.stringify(version)};\n` +
    `export const MAPLIBRE_JS = ${JSON.stringify(js)};\n` +
    `export const MAPLIBRE_CSS = ${JSON.stringify(css)};\n`,
);
console.log(`MapLibre ${version} embutido no app (${Math.round(js.length / 1024)} KB).`);
