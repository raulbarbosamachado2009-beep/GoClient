// Verifica a chave da NVIDIA (secret NVIDIA_API_KEY) sem imprimi-la: lista modelos e testa
// quais acertam as ações da Havena (chamada de ferramentas) em português, e quanto demoram.
const KEY = process.env.NVIDIA_API_KEY ?? '';
if (!KEY) {
  console.log('NVIDIA_API_KEY ausente');
  process.exit(1);
}
const BASE = 'https://integrate.api.nvidia.com/v1';
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const list = await fetch(`${BASE}/models`, { headers: H }).then((r) => r.json());
const ids = (list.data ?? []).map((m) => m.id);
console.log(`modelos disponíveis: ${ids.length}`);
const wanted = [
  /llama-3\.3-nemotron-super/,
  /nemotron-.*super/,
  /^meta\/llama-3\.3-70b-instruct$/,
  /^meta\/llama-4-maverick/,
  /^qwen\/qwen3.*(235b|480b|next)/,
  /^moonshotai\/kimi-k2/,
  /^moonshotai\/kimi-k3/,
  /^openai\/gpt-oss-120b$/,
  /^mistralai\/mistral-(medium|large)/,
  /^deepseek-ai\/deepseek-v3/,
];
const picked = [];
for (const re of wanted) {
  const m = ids.find((id) => re.test(id) && !picked.includes(id));
  if (m) picked.push(m);
}
console.log('candidatos:', picked.join(', '));
console.log(
  'todos com "llama|nemotron|qwen|kimi|gpt-oss|mistral|deepseek|gemma":',
  ids.filter((i) => /llama|nemotron|qwen|kimi|gpt-oss|mistral|deepseek|gemma/.test(i)).join(', '),
);

const tools = [
  [
    'buscar_cliente_kyte',
    'Procura um cliente no Kyte pelo nome e devolve o endereço.',
    { nome: { type: 'string' } },
    ['nome'],
  ],
  [
    'adicionar_na_rota',
    'Coloca um endereço como parada na rota do dia.',
    {
      endereco: { type: 'string' },
      agora: { type: 'boolean', description: 'true para ir agora (primeira parada)' },
    },
    ['endereco'],
  ],
  [
    'tocar_musica',
    'Procura e toca uma música no Spotify agora, ou põe na fila.',
    { busca: { type: 'string' }, fila: { type: 'boolean' } },
    ['busca'],
  ],
  ['proxima_musica', 'Pula para a próxima música.', {}, []],
  [
    'enviar_whatsapp',
    'Abre o WhatsApp do cliente com a mensagem pronta.',
    { cliente: { type: 'string' }, mensagem: { type: 'string' } },
    ['cliente', 'mensagem'],
  ],
].map(([name, description, properties, required]) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
}));

const cases = [
  ['Havena, passa a música', ['proxima_musica']],
  ['coloca o Marcos na rota pra eu ir agora', ['buscar_cliente_kyte']],
  ['toca Evidências do Chitãozinho e Xororó', ['tocar_musica']],
  ['manda um zap pro Adriano avisando que eu chego em 10 minutos', ['enviar_whatsapp']],
];

for (const model of picked) {
  let ok = 0;
  let ms = 0;
  const notes = [];
  for (const [text, expect] of cases) {
    const t = Date.now();
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: H,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 400,
          tools,
          tool_choice: 'auto',
          messages: [
            {
              role: 'system',
              content:
                'Você é a Havena, assistente de voz do app GoClient, em português do Brasil. Use as ferramentas para agir. Para pôr um cliente na rota, primeiro busque o cliente no Kyte.',
            },
            { role: 'user', content: text },
          ],
        }),
      });
      const j = await res.json();
      ms += Date.now() - t;
      const calls = j.choices?.[0]?.message?.tool_calls?.map((c) => c.function?.name) ?? [];
      const hit = expect.every((e) => calls.includes(e));
      if (hit) ok++;
      notes.push(
        `${hit ? 'ok' : 'X'}(${res.status}:${calls.join('+') || (j.choices?.[0]?.message?.content ?? JSON.stringify(j).slice(0, 60)).slice(0, 40)})`,
      );
    } catch (e) {
      notes.push(`erro ${String(e).slice(0, 40)}`);
    }
  }
  console.log(
    `\n${model}: ${ok}/${cases.length} acertos, média ${Math.round(ms / cases.length)} ms`,
  );
  console.log('  ', notes.join(' | '));
}
