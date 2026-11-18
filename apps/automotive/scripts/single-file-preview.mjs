#!/usr/bin/env node
/**
 * Gera um Preview do Automotive em UM único arquivo HTML (dist-preview/index.html), para
 * compartilhar o design como página estática — sem servidor, sem caminhos absolutos.
 *
 * Pré-requisito: `expo export --platform web --output-dir dist`.
 *
 * O que faz:
 * - embute o runtime, o bundle comum, todos os chunks de rota e o bundle de entrada;
 * - marca os chunks como já carregados para o carregador assíncrono do Metro;
 * - embute as fontes de ícones como data URIs;
 * - protege a navegação quando o ambiente bloqueia `history.pushState` (iframes isolados).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(appRoot, 'dist');
const outDir = join(appRoot, 'dist-preview');
const jsDir = join(dist, '_expo/static/js/web');

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const initial = [
  ...html.matchAll(/<script src="\/(_expo\/static\/js\/web\/[^"]+)"[^>]*><\/script>/g),
].map((m) => m[1]);
const runtime = initial.find((p) => p.includes('__expo-metro-runtime'));
const common = initial.find((p) => p.includes('__common'));
const entry = initial.find((p) => p.includes('/entry-'));
if (!runtime || !entry) throw new Error('index.html inesperado: rode o export web antes.');

const chunks = readdirSync(jsDir)
  .map((f) => `_expo/static/js/web/${f}`)
  .filter((p) => p.endsWith('.js') && !initial.includes(p));

// Fontes referenciadas pelos bundles -> data URIs.
const fontRefs = new Set();
const allJs = [runtime, common, ...chunks, entry].filter(Boolean);
for (const p of allJs) {
  for (const m of readFileSync(join(dist, p), 'utf8').matchAll(/"(\/assets\/[^"]+\.(?:ttf|otf))"/g))
    fontRefs.add(m[1]);
}
const fontData = new Map(
  [...fontRefs].map((ref) => [
    ref,
    `data:font/ttf;base64,${readFileSync(join(dist, ref)).toString('base64')}`,
  ]),
);

const read = (p) => {
  let src = readFileSync(join(dist, p), 'utf8');
  for (const [ref, data] of fontData) src = src.split(`"${ref}"`).join(`"${data}"`);
  // Impede que "</script>" dentro do código feche a tag inline.
  return src.replace(/<\/script/gi, '<\\/script');
};

const shim = `
(function () {
  // Todos os chunks já estão nesta página: o carregador assíncrono só precisa confirmar.
  var key = '__loadBundleAsync';
  var ready = function () { return Promise.resolve(); };
  ready.isReady = function () { return true; };
  Object.defineProperty(globalThis, key, { configurable: true, get: function () { return ready; }, set: function () {} });
  // Em iframes isolados, history.pushState pode ser bloqueado; a navegação segue em memória.
  ['pushState', 'replaceState'].forEach(function (m) {
    var orig = history[m].bind(history);
    history[m] = function () { try { return orig.apply(null, arguments); } catch (e) { return undefined; } };
  });
  try { if (location.pathname !== '/') history.replaceState(null, '', '/'); } catch (e) {}
})();`;

const scripts = [
  `<script>${read(runtime)}</script>`,
  `<script>${shim}</script>`,
  common ? `<script>${read(common)}</script>` : '',
  ...chunks.map((p) => `<script>${read(p)}</script>`),
  `<script>${read(entry)}</script>`,
].join('\n');

const out = html
  .replace(/<script src="\/_expo[^>]*><\/script>/g, '')
  .replace(/<link rel="icon"[^>]*\/>/, '')
  .replace('<html lang="en">', '<html lang="pt-BR">')
  .replace(
    '<title>GoClient Automotive</title>',
    '<title>GoClient Automotive — Preview de design</title>',
  )
  .replace('</body>', () => `${scripts}\n</body>`); // função: evita que "$'" do JS vire padrão de substituição

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), out);
console.log(
  `Preview gerado: ${join(outDir, 'index.html')} (${(out.length / 1024 / 1024).toFixed(1)} MB, ${chunks.length} chunks, ${fontData.size} fontes)`,
);
