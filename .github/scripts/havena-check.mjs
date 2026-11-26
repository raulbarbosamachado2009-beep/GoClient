// Conversas reais com a Havena (modelo da NVIDIA + as ferramentas do app), com resultados de
// ferramenta simulados. Verifica se ela encadeia as ações certas. Não imprime a chave.
import { readFileSync } from 'node:fs';

const KEY = process.env.NVIDIA_API_KEY ?? '';
if (!KEY) process.exit(1);
const tools = JSON.parse(readFileSync(new URL('./havena-tools.json', import.meta.url)));
const session = readFileSync(
  new URL('../../apps/automotive/src/havena/session.ts', import.meta.url),
  'utf8',
);
const SYSTEM = /const SYSTEM = `([\s\S]*?)`;/.exec(session)[1];
const MODELS = ['nvidia/nemotron-3.5-super-vl-120b-a12b'];

const fake = {
  cliente_buscar: ({ nome }) =>
    /adil/i.test(nome)
      ? {
          name: 'Adilsom/ Dona Bimba',
          phone: '(19) 99876-5432',
          address: 'Rua Dona Bimba, 750, Campinas',
        }
      : /adriano/i.test(nome)
        ? { varios: ['Adriano', 'Adriano Barb. Americanópolis'] }
        : /adiu|adilç|adirso/i.test(nome.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
          ? { nenhum_exato: nome, parecidos: ['Adilsom/ Dona Bimba', 'Adriano'] }
          : `Nenhum cliente com "${nome}". Pode ser um lugar: tente lugar_buscar.`,
  lugar_buscar: ({ busca }) =>
    /alvarenga/i.test(busca)
      ? [
          { endereco: 'Avenida Alvarenga, Vila Industrial, Campinas, SP', km_do_carro: 3.2 },
          { endereco: 'Rua Alvarenga, Butantã, São Paulo, SP', km_do_carro: 88.4 },
        ]
      : /iguatemi/i.test(busca)
        ? [
            {
              endereco: 'Shopping Iguatemi Campinas, Avenida Iguatemi, Campinas, SP',
              km_do_carro: 6.1,
            },
          ]
        : `Não achei "${busca}" no mapa.`,
  vendas_resumo: () => ({
    today: { count: 0, total: 'R$ 0,00' },
    yesterday: { count: 47, total: 'R$ 9.403,00' },
    week: { count: 0, total: 'R$ 0,00' },
    month: { count: 158, total: 'R$ 27.913,00' },
  }),
};
const CONFIRM = ['rota_colocar', 'whatsapp', 'kyte_novo_cliente', 'kyte_novo_produto'];

const cases = [
  'coloca o Adilsom na rota',
  'me leva no Adilsom agora',
  'quanto eu vendi ontem?',
  'manda um zap pro Adilsom dizendo que eu chego em dez minutos',
  'coloca o Adriano na rota',
  'abre o Kyte',
  'me leva até a Alvarenga',
  'bora pro iguatemi',
  'coloca o Adíuson na rota',
];

for (const model of MODELS) {
  console.log(`\n=== ${model}`);
  for (const text of cases) {
    const msgs = [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: text },
    ];
    const trail = [];
    let final = '';
    const t0 = Date.now();
    for (let round = 0; round < 4; round++) {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 500,
          messages: msgs,
          tools: tools.map((f) => ({ type: 'function', function: f })),
          tool_choice: 'auto',
        }),
      });
      const j = await res.json();
      const m = j.choices?.[0]?.message;
      if (!m) {
        final = `HTTP ${res.status}`;
        break;
      }
      if (!m.tool_calls?.length) {
        final = (m.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        break;
      }
      msgs.push({ role: 'assistant', content: m.content ?? null, tool_calls: m.tool_calls });
      let stop = false;
      for (const c of m.tool_calls) {
        const args = JSON.parse(c.function.arguments || '{}');
        trail.push(`${c.function.name}(${JSON.stringify(args)})`);
        if (CONFIRM.includes(c.function.name)) {
          final = '[pede confirmação]';
          stop = true;
          break;
        }
        const out = fake[c.function.name]?.(args) ?? 'feito';
        msgs.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(out) });
      }
      if (stop) break;
    }
    console.log(`\n> ${text}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    console.log(`  ações: ${trail.join(' → ') || '(nenhuma)'}`);
    console.log(`  fala: ${final.slice(0, 200)}`);
  }
}
