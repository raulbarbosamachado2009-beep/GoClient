import { MAPLIBRE_CSS, MAPLIBRE_JS } from './vendor/maplibre.generated';

/**
 * Página do mapa real (OpenFreeMap + MapLibre GL JS), aberta numa WebView. O app manda o
 * estado com `window.__gc(estado)`: posição e direção do carro, linha da rota, pinos dos
 * clientes, se a câmera segue o carro (navegação) e as margens livres da tela.
 *
 * O mapa vem do OpenFreeMap (gratuito, sem chave e sem limite de uso; dados do
 * OpenStreetMap). A biblioteca (MapLibre) vem dentro do app, sem download: ver
 * scripts/vendor-maplibre.mjs. O tema troca sem recarregar a página (`restyle`).
 */
export interface MapState {
  dark: boolean;
  user: { lat: number; lng: number } | null;
  heading: number | null;
  path: [number, number][];
  pins: { id: string; lat: number; lng: number; label: string; stop: boolean }[];
  follow: boolean;
  padding: { top: number; right: number; bottom: number; left: number };
}

/** Cores do mapa (controles, fundo) para o tema claro ou escuro. */
function themeCss(dark: boolean): string {
  return `
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${dark ? '#1b1b1d' : '#e9e9ec'}; }
  .me { width: 22px; height: 22px; border-radius: 50%; background: #0A84FF; border: 3px solid #fff;
        box-shadow: 0 0 0 8px rgba(10,132,255,.22); position: relative; }
  .me .cone { position: absolute; left: 50%; top: -15px; width: 0; height: 0; margin-left: -7px;
        border-left: 7px solid transparent; border-right: 7px solid transparent;
        border-bottom: 12px solid #0A84FF; display: none; }
  .pin { min-width: 26px; height: 26px; padding: 0 6px; border-radius: 13px; border: 2px solid #fff;
        color: #fff; font: 600 14px -apple-system, Roboto, sans-serif; display: flex;
        align-items: center; justify-content: center; box-sizing: border-box; }
  .maplibregl-ctrl-attrib { font-size: 10px; }
  ${dark ? '.maplibregl-ctrl-attrib, .maplibregl-ctrl-attrib.maplibregl-compact { background: rgba(46,59,85,.9) !important; color: #c9d3e6; } .maplibregl-ctrl-attrib a { color: #c9d3e6 !important; } .maplibregl-ctrl-attrib-button { filter: invert(1); }' : ''}
  #ctl { position: absolute; z-index: 5; display: none; flex-direction: column; gap: 10px; }
  #ctl .grp { display: flex; flex-direction: column; border-radius: 26px; overflow: hidden;
        background: ${dark ? 'rgba(46,59,85,.95)' : 'rgba(250,250,252,.96)'};
        border: 1px solid ${dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)'};
        box-shadow: 0 2px 10px rgba(0,0,0,.25); }
  #ctl button { width: 52px; height: 50px; border: 0; background: transparent; padding: 0;
        color: ${dark ? '#F2F2F7' : '#1C1C1E'}; font: 400 28px/48px -apple-system, Roboto, sans-serif;
        display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; }
  #ctl button:active { background: ${dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)'}; }
  #ctl .sep { height: 1px; margin: 0 10px; background: ${dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)'}; }
  #ctl svg { width: 24px; height: 24px; }
  #ctl .on svg { fill: #0A84FF; }
`;
}

/**
 * Estilo do mapa (JavaScript da página). Escuro: paleta do Apple Maps à noite (terra
 * azul-ardósia, água azul-marinho, ruas claras, nomes de rua em caixa alta) e lugares como
 * bolinhas coloridas por tipo, com o nome ao lado na mesma cor. Sem prédios 3D (pesam).
 */
const NIGHT_STYLE = `
  var POI_COLORS = { food: '#FF9F0A', shop: '#FFD60A', car: '#0A84FF', health: '#FF453A',
    leisure: '#30D158', school: '#BF5AF2', other: '#98989D' };
  var POI_GROUP = ['match', ['get', 'class'],
    ['restaurant', 'fast_food', 'cafe', 'bar', 'beer', 'ice_cream', 'bakery', 'food'], 'food',
    ['shop', 'grocery', 'convenience', 'clothing_store', 'shoes', 'hairdresser', 'jewelry', 'florist', 'furniture', 'hardware', 'alcohol_shop', 'mobile_phone'], 'shop',
    ['fuel', 'car', 'parking', 'bicycle'], 'car',
    ['hospital', 'pharmacy', 'doctors', 'dentist', 'veterinary'], 'health',
    ['park', 'sport', 'stadium', 'pitch', 'garden', 'playground', 'swimming', 'golf'], 'leisure',
    ['school', 'college', 'university', 'library', 'kindergarten'], 'school',
    'other'];
  function dot(color) {
    var n = 34, cv = document.createElement('canvas'); cv.width = cv.height = n;
    var g = cv.getContext('2d');
    g.beginPath(); g.arc(n / 2, n / 2, 14, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
    g.beginPath(); g.arc(n / 2, n / 2, 11.5, 0, Math.PI * 2); g.fillStyle = color; g.fill();
    g.beginPath(); g.arc(n / 2, n / 2, 3.5, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
    return g.getImageData(0, 0, n, n);
  }
  function styleFor(st, dark) {
    var N = {
      land: '#36445E', blocks: '#3A4865', building: '#2A3650', park: '#2E4A55', water: '#1D3564',
      river: '#29497F', minor: '#55658A', mid: '#6A7A9C', major: '#7D8CAC', motorway: '#94A1BE',
      casing: '#2C3850', path: '#46557A', rail: '#4B5873', label: '#D3DBEA', halo: '#2C3952',
      place: '#E6EBF4'
    };
    st.layers = st.layers.filter(function (l) {
      return l.id !== 'building-3d' && l.id !== 'natural_earth';
    });
    st.layers.forEach(function (l) {
      var id = l.id, p = l.paint = l.paint || {}, y = l.layout = l.layout || {};
      // Lugares: bolinha colorida + nome ao lado, na cor do tipo.
      if (/^poi_r/.test(id)) {
        y['icon-image'] = ['concat', 'gc-', POI_GROUP];
        y['icon-size'] = 1; y['text-anchor'] = 'left'; y['text-offset'] = [1.15, 0];
        y['text-justify'] = 'left'; y['text-font'] = ['Noto Sans Bold']; y['text-size'] = 13;
        var colors = ['match', POI_GROUP];
        Object.keys(POI_COLORS).forEach(function (k) { colors.push(k, POI_COLORS[k]); });
        colors.push('#98989D');
        p['text-color'] = colors;
        p['text-halo-color'] = dark ? N.halo : '#ffffff'; p['text-halo-width'] = 1.4; p['text-halo-blur'] = 0;
        return;
      }
      if (!dark) return;
      if (id === 'poi_transit') {
        y['text-font'] = ['Noto Sans Regular']; y['text-size'] = 12;
        p['text-color'] = '#8FB4FF'; p['text-halo-color'] = N.halo; p['text-halo-width'] = 1.2;
        return;
      }
      if (id === 'background') p['background-color'] = N.land;
      else if (/^landuse_residential/.test(id)) { p['fill-color'] = N.blocks; p['fill-opacity'] = 1; }
      else if (/^landuse|landcover_sand/.test(id)) { p['fill-color'] = N.blocks; p['fill-opacity'] = 0.6; }
      else if (/^park$|landcover_(wood|grass|wetland)/.test(id)) { p['fill-color'] = N.park; p['fill-opacity'] = 0.9; }
      else if (id === 'park_outline') p['line-color'] = N.park;
      else if (id === 'water') p['fill-color'] = N.water;
      else if (/^waterway/.test(id) && l.type === 'line') p['line-color'] = N.river;
      else if (id === 'building') { p['fill-color'] = N.building; p['fill-outline-color'] = '#253048'; }
      else if (/^aeroway/.test(id)) { if (l.type === 'fill') p['fill-color'] = N.blocks; else p['line-color'] = N.mid; }
      else if (l.type === 'line' && /casing/.test(id)) p['line-color'] = N.casing;
      else if (l.type === 'line' && /rail/.test(id)) p['line-color'] = N.rail;
      else if (l.type === 'line' && /path_pedestrian/.test(id)) p['line-color'] = N.path;
      else if (l.type === 'line' && /motorway/.test(id)) p['line-color'] = N.motorway;
      else if (l.type === 'line' && /trunk_primary/.test(id)) p['line-color'] = N.major;
      else if (l.type === 'line' && /secondary_tertiary/.test(id)) p['line-color'] = N.mid;
      else if (l.type === 'line' && /minor|street|service|link/.test(id)) p['line-color'] = N.minor;
      else if (id === 'road_area_pattern') y.visibility = 'none';
      else if (/^boundary/.test(id)) p['line-color'] = '#5A6888';
      else if (l.type === 'symbol' && /^highway-name/.test(id)) {
        // Nomes de rua como no Apple Maps: caixa alta, espaçados, claros.
        y['text-transform'] = 'uppercase'; y['text-letter-spacing'] = 0.12;
        y['text-font'] = ['Noto Sans Bold'];
        y['text-size'] = ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 12, 18, 14];
        p['text-color'] = N.label; p['text-halo-color'] = N.halo; p['text-halo-width'] = 1.2; p['text-halo-blur'] = 0;
      } else if (l.type === 'symbol' && /^(label_|airport|water_name|waterway_line_label)/.test(id)) {
        p['text-color'] = /water/.test(id) ? '#8FB0EE' : N.place;
        p['text-halo-color'] = N.halo; p['text-halo-width'] = 1.3;
      } else if (l.type === 'symbol' && /shield|one_way/.test(id)) {
        if (/one_way/.test(id)) p['icon-opacity'] = 0.5;
      }
    });
    return st;
  }
`;

export function mapHtml(dark: boolean): string {
  // Base: estilo "liberty" do OpenFreeMap (tem lugares, prédios e nomes de rua); no escuro,
  // recolorido no tom do Apple Maps à noite (ver NIGHT_STYLE).
  const style = 'https://tiles.openfreemap.org/styles/liberty';
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin />
<style>${MAPLIBRE_CSS}</style>
<style id="theme-light">${themeCss(false)}</style>
<style id="theme-dark" media="${dark ? 'all' : 'not all'}">${themeCss(true)}</style>
</head><body><div id="map"></div>
<div id="ctl">
  <div class="grp">
    <button id="zin" aria-label="Aproximar">+</button><div class="sep"></div>
    <button id="zout" aria-label="Afastar">&minus;</button><div class="sep"></div>
    <button id="loc" aria-label="Minha localização">
    <svg viewBox="0 0 24 24" fill="none" stroke="#0A84FF" stroke-width="2" stroke-linejoin="round"><path d="M21 3 3 10.5l7.5 3L13.5 21z"/></svg>
  </button></div>
</div>
<script>
  function post(m) { try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} }
  // O estilo é pedido antes de a biblioteca (que vem dentro do app, sem baixar da internet;
  // ver vendor-maplibre.mjs) ser lida, para os dois andarem juntos.
  var styleReq = fetch('${style}').then(function (r) { return r.json(); });
</script>
<script>${MAPLIBRE_JS}</script>
<script>
  var state = null, map = null, me = null, markers = {}, lastRoute = '', centered = false, wasFollow = false;
  // Navegando: zoom escolhido pela pessoa (pinça ou botões) e pausa quando ela arrasta o mapa.
  var followZoom = 17, paused = false;
  var styled = false;
  window.__gc = function (s) {
    state = s;
    if (!map || !styled) return;
    if (s.dark !== curDark) restyle(s.dark); else apply();
  };
  // Troca de tema sem recarregar a página: só o estilo muda (a rota e os pinos continuam).
  function restyle(d) {
    curDark = d;
    document.getElementById('theme-dark').media = d ? 'all' : 'not all';
    if (typeof styleJson === 'string') return apply();
    styled = false;
    map.setStyle(styleFor(JSON.parse(JSON.stringify(styleJson)), d), {
      diff: false,
      transformStyle: function (prev, next) {
        next.sources.route = { type: 'geojson', data: line(state ? state.path : []) };
        next.layers.push(ROUTE_CASE, ROUTE_LINE);
        return next;
      },
    });
    map.once('style.load', function () { styled = true; if (state) apply(); });
  }
  var ROUTE_CASE = { id: 'route-case', type: 'line', source: 'route',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#0A3D91', 'line-width': 10 } };
  var ROUTE_LINE = { id: 'route', type: 'line', source: 'route',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#0A84FF', 'line-width': 6 } };
  // Carregamento rápido: o estilo é pedido junto com a biblioteca (não depois dela) e fica
  // guardado no aparelho; da segunda vez em diante o mapa abre com o estilo salvo na hora e
  // a cópia é atualizada por trás.
  var STYLE_KEY = 'gc-style-v1';
  var styleJson = null, libReady = typeof maplibregl !== 'undefined', curDark = ${dark};
  try { styleJson = JSON.parse(localStorage.getItem(STYLE_KEY) || 'null'); } catch (e) {}
  styleReq
    .then(function (st) {
      try { localStorage.setItem(STYLE_KEY, JSON.stringify(st)); } catch (e) {}
      if (!styleJson) { styleJson = st; start(); }
    })
    .catch(function () { if (!styleJson) { styleJson = '${style}'; start(); } });
  if (!libReady) post({ type: 'error', message: 'Não foi possível carregar o mapa' });

  function start() {
    if (!libReady || !styleJson || map) return;
    create(typeof styleJson === 'string' ? styleJson : styleFor(JSON.parse(JSON.stringify(styleJson)), curDark));
  }
${NIGHT_STYLE}
  // Abre onde a pessoa estava da última vez (até o GPS responder), nunca numa cidade fixa.
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('gc-view') || 'null'); } catch (e) {}
  function create(st) {
    map = new maplibregl.Map({
      container: 'map', style: st, center: saved ? saved.c : [-46.6333, -23.5505], zoom: saved ? saved.z : 11,
      attributionControl: { compact: true }, pitchWithRotate: false, dragRotate: false,
      // Sem esmaecer os blocos ao chegar (aparecem na hora) e sem checar colisão de rótulos
      // entre fontes diferentes (menos trabalho no primeiro desenho).
      fadeDuration: 0, crossSourceCollisions: false, refreshExpiredTiles: false,
    });
    // Bolinhas coloridas dos lugares (desenhadas aqui, sem depender de imagens de fora).
    map.on('styleimagemissing', function (e) {
      var c = POI_COLORS[e.id.replace('gc-', '')];
      if (c) map.addImage(e.id, dot(c), { pixelRatio: 2 });
    });
    // 'style.load' chega antes de 'load' (que espera todos os blocos): a rota e os pinos já
    // entram enquanto o resto do mapa termina de chegar.
    map.once('style.load', function () {
      styled = true;
      map.addSource('route', { type: 'geojson', data: line([]) });
      map.addLayer(ROUTE_CASE);
      map.addLayer(ROUTE_LINE);
      post({ type: 'ready' });
      map.once('load', function () { post({ type: 'loaded' }); });
      mark();
      if (state) apply();
    });
    // Gestos da pessoa (não os movimentos de câmera do app).
    map.on('dragstart', function (e) { if (e.originalEvent && state && state.follow) { paused = true; mark(); } });
    map.on('zoomend', function (e) { if (e.originalEvent && state && state.follow) followZoom = map.getZoom(); });
    document.getElementById('zin').onclick = function () { zoomBy(1); };
    document.getElementById('zout').onclick = function () { zoomBy(-1); };
    document.getElementById('loc').onclick = function () {
      paused = false; mark();
      if (!state || !state.user) return;
      if (state.follow) { followZoom = Math.max(followZoom, 17); apply(); }
      else map.easeTo({ center: [state.user.lng, state.user.lat], zoom: Math.max(map.getZoom(), 16), padding: state.padding, duration: 600 });
    };
    map.on('moveend', function () {
      try { var c = map.getCenter(); localStorage.setItem('gc-view', JSON.stringify({ c: [c.lng, c.lat], z: Math.min(map.getZoom(), 16) })); } catch (e) {}
    });
    map.on('error', function (e) { post({ type: 'error', message: String(e && e.error && e.error.message || e) }); });
  }

  var zTarget = null;
  function zoomBy(d) {
    // Toques seguidos somam a partir do zoom de destino, não do meio da animação.
    var base = zTarget != null && map.isEasing() ? zTarget : map.getZoom();
    var z = zTarget = Math.max(3, Math.min(20, Math.round(base) + d));
    if (state && state.follow) followZoom = z;
    map.easeTo({ zoom: z, duration: 300 });
  }
  function mark() { document.getElementById('loc').className = paused ? '' : 'on'; }
  function place(p) {
    var c = document.getElementById('ctl'); c.style.display = 'flex';
    c.style.right = (p.right > 120 ? p.right + 16 : 16) + 'px';
    c.style.top = Math.max(p.top, 16) + 'px';
  }

  function line(coords) {
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
  }

  function apply() {
    var s = state;
    place(s.padding);
    var src = map.getSource('route');
    if (src) src.setData(line(s.path));

    // Pinos dos clientes / paradas.
    var keep = {};
    s.pins.forEach(function (p) {
      keep[p.id] = true;
      var m = markers[p.id];
      if (!m) {
        var el = document.createElement('div'); el.className = 'pin';
        m = markers[p.id] = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      }
      var e = m.getElement(); e.textContent = p.label;
      e.style.background = p.stop ? '#0A84FF' : (s.dark ? '#3A3A3C' : '#8E8E93');
      m.setLngLat([p.lng, p.lat]);
    });
    Object.keys(markers).forEach(function (id) { if (!keep[id]) { markers[id].remove(); delete markers[id]; } });

    // Carro.
    if (s.user) {
      if (!me) {
        var el = document.createElement('div'); el.className = 'me';
        var cone = document.createElement('div'); cone.className = 'cone'; el.appendChild(cone);
        me = new maplibregl.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'viewport' }).setLngLat([s.user.lng, s.user.lat]).addTo(map);
      }
      me.setLngLat([s.user.lng, s.user.lat]);
      var c = me.getElement().firstChild;
      if (s.heading != null) { c.style.display = 'block'; me.setRotation(s.heading); } else c.style.display = 'none';
    }

    // Câmera: navegando, segue o carro olhando para a frente; com rota nova, mostra a rota
    // inteira; sem rota, centra no carro uma vez.
    var key = s.path.length ? s.path.length + ':' + s.path[0] + ':' + s.path[s.path.length - 1] : '';
    if (!s.follow) paused = false;
    if (s.follow && s.user) {
      if (!paused) map.easeTo({ center: [s.user.lng, s.user.lat], zoom: followZoom, pitch: 50,
        bearing: s.heading != null ? s.heading : map.getBearing(), padding: s.padding, duration: 900 });
    } else if (key && (key !== lastRoute || wasFollow)) {
      var b = s.path.reduce(function (acc, p) { return acc.extend(p); }, new maplibregl.LngLatBounds(s.path[0], s.path[0]));
      map.fitBounds(b, { padding: s.padding, pitch: 0, bearing: 0, duration: 700, maxZoom: 16 });
    } else if (s.user && !centered && !key) {
      map.jumpTo({ center: [s.user.lng, s.user.lat], zoom: 16, padding: s.padding });
    }
    if (s.user) centered = true;
    lastRoute = key;
    wasFollow = !!(s.follow && s.user);
  }
  // Estilo já salvo no aparelho: o mapa começa na hora, sem esperar a rede.
  start();
</script>
</body></html>`;
}

/**
 * Página invisível que só baixa a biblioteca e o estilo do mapa (para o cache das WebViews)
 * e guarda o estilo no aparelho, com a mesma chave que a página do mapa usa.
 */
export function warmupHtml(): string {
  const style = 'https://tiles.openfreemap.org/styles/liberty';
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><script>
  function done() { try { window.ReactNativeWebView.postMessage('warm'); } catch (e) {} }
  fetch('${style}').then(function (r) { return r.json(); }).then(function (st) {
    try { localStorage.setItem('gc-style-v1', JSON.stringify(st)); } catch (e) {}
    // Sprite dos ícones também (é o próximo pedido do mapa).
    if (st.sprite) { var s = Array.isArray(st.sprite) ? st.sprite[0].url : st.sprite;
      return Promise.all([fetch(s + '.json'), fetch(s + '.png')]); }
  }).catch(function () {}).then(done);
</script></body></html>`;
}
