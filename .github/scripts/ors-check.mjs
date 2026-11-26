// Verifica a chave do OpenRouteService (secret ORS_API_KEY) com pedidos reais, sem imprimir
// a chave: endereço → coordenadas, rota "por dentro" e ordem das paradas.
const KEY = process.env.ORS_API_KEY ?? '';
if (!KEY) {
  console.log('ORS_API_KEY ausente');
  process.exit(1);
}
const BASE = 'https://api.heigit.org';
const H = { Authorization: KEY, 'Content-Type': 'application/json', Accept: 'application/json' };

async function call(name, url, init) {
  const t = Date.now();
  const res = await fetch(url, init);
  const text = await res.text();
  console.log(`\n[${name}] HTTP ${res.status} em ${Date.now() - t} ms`);
  for (const h of ['x-ratelimit-limit', 'x-ratelimit-remaining']) {
    if (res.headers.get(h)) console.log(`  ${h}: ${res.headers.get(h)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    console.log(text.slice(0, 400));
    return null;
  }
}

const geo = await call(
  'geocode',
  `${BASE}/pelias/v1/search?text=${encodeURIComponent('Rua Barão de Jaguara, 1240, Campinas, SP, Brasil')}&boundary.country=BR&size=1&lang=pt`,
  { headers: H },
);
const f = geo?.features?.[0];
console.log('  achou:', f?.properties?.label, f?.geometry?.coordinates);

// Centro de Campinas → Jardim Ipaussurama → Ponte Preta (pontos fixos para comparar).
const pts = [
  [-47.0608, -22.9056],
  [-47.1213, -22.9206],
  [-47.0565, -22.923],
];
for (const preference of ['recommended', 'shortest']) {
  const r = await call(`rota ${preference}`, `${BASE}/openrouteservice/v2/directions/driving-car`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      coordinates: pts,
      preference,
      options: { avoid_features: ['highways'] },
      language: 'pt',
      instructions: true,
      units: 'm',
    }),
  });
  const route = r?.routes?.[0];
  if (!route) {
    console.log('  erro:', JSON.stringify(r?.error ?? r).slice(0, 300));
    continue;
  }
  const steps = route.segments?.flatMap((s) => s.steps) ?? [];
  console.log(
    `  ${(route.summary.distance / 1000).toFixed(1)} km, ${Math.round(route.summary.duration / 60)} min, ${steps.length} manobras, geometria ${typeof route.geometry} (${String(route.geometry).length} car.)`,
  );
  console.log(
    '  1ª manobras:',
    steps
      .slice(0, 3)
      .map((s) => `${s.type}:${s.instruction}`)
      .join(' | '),
  );
}

const opt = await call('ordem das paradas', `${BASE}/vroom/v0`, {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    jobs: [
      { id: 1, location: [-47.1213, -22.9206] },
      { id: 2, location: [-47.0565, -22.923] },
      { id: 3, location: [-47.07, -22.895] },
    ],
    vehicles: [{ id: 1, profile: 'driving-car', start: pts[0], end: [-47.09, -22.88] }],
  }),
});
console.log(
  '  ordem:',
  opt?.routes?.[0]?.steps?.filter((s) => s.type === 'job').map((s) => s.id) ??
    JSON.stringify(opt).slice(0, 300),
);
