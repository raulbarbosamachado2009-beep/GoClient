/**
 * Página do mapa real (OpenFreeMap + MapLibre GL JS), aberta numa WebView. O app manda o
 * estado com `window.__gc(estado)`: posição e direção do carro, linha da rota, pinos dos
 * clientes, se a câmera segue o carro (navegação) e as margens livres da tela.
 *
 * O mapa vem do OpenFreeMap (gratuito, sem chave e sem limite de uso; dados do
 * OpenStreetMap). A biblioteca é carregada do unpkg, com o jsDelivr de reserva.
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

const VERSION = '5.24.1';

export function mapHtml(dark: boolean): string {
  const style = `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'liberty'}`;
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${VERSION}/dist/maplibre-gl.css"
  onerror="this.href='https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSION}/dist/maplibre-gl.css'" />
<style>
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
</style>
</head><body><div id="map"></div>
<script>
  function post(m) { try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} }
  function load(src, alt, done) {
    var s = document.createElement('script'); s.src = src; s.onload = done;
    s.onerror = function () { var b = document.createElement('script'); b.src = alt; b.onload = done;
      b.onerror = function () { post({ type: 'error', message: 'Não foi possível carregar o mapa' }); };
      document.head.appendChild(b); };
    document.head.appendChild(s);
  }
  var state = null, map = null, me = null, markers = {}, lastRoute = '', centered = false, wasFollow = false;
  window.__gc = function (s) { state = s; if (map && map.loaded()) apply(); };
  load('https://unpkg.com/maplibre-gl@${VERSION}/dist/maplibre-gl.js',
       'https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSION}/dist/maplibre-gl.js', start);

  function start() {
    map = new maplibregl.Map({
      container: 'map', style: '${style}', center: [-47.0608, -22.9056], zoom: 12,
      attributionControl: { compact: true }, pitchWithRotate: false, dragRotate: false,
    });
    map.on('load', function () {
      map.addSource('route', { type: 'geojson', data: line([]) });
      map.addLayer({ id: 'route-case', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#0A3D91', 'line-width': 10 } });
      map.addLayer({ id: 'route', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#0A84FF', 'line-width': 6 } });
      post({ type: 'ready' });
      if (state) apply();
    });
    map.on('error', function (e) { post({ type: 'error', message: String(e && e.error && e.error.message || e) }); });
  }

  function line(coords) {
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
  }

  function apply() {
    var s = state;
    map.getSource('route').setData(line(s.path));

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
    if (s.follow && s.user) {
      map.easeTo({ center: [s.user.lng, s.user.lat], zoom: 17, pitch: 50,
        bearing: s.heading != null ? s.heading : map.getBearing(), padding: s.padding, duration: 900 });
    } else if (key && (key !== lastRoute || wasFollow)) {
      var b = s.path.reduce(function (acc, p) { return acc.extend(p); }, new maplibregl.LngLatBounds(s.path[0], s.path[0]));
      map.fitBounds(b, { padding: s.padding, pitch: 0, bearing: 0, duration: 700, maxZoom: 16 });
    } else if (s.user && !centered && !key) {
      map.jumpTo({ center: [s.user.lng, s.user.lat], zoom: 15, padding: s.padding });
    }
    if (s.user) centered = true;
    lastRoute = key;
    wasFollow = !!(s.follow && s.user);
  }
</script>
</body></html>`;
}
