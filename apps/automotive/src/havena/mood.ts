/**
 * Humor do Lucas na resposta (pedido do usuário em 26/11/2026): quando a pessoa conta uma
 * piada, ele ri (`joke`); quando uma ação dá errado, ele fica triste e pede desculpas
 * (`sad`). O humor vale só enquanto ele fala aquela resposta.
 */
export type Mood = 'joke' | 'sad' | null;

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** A fala da pessoa parece uma piada (ou risada)? */
export function isJoke(text: string): boolean {
  const t = norm(text);
  return (
    /\b(k{3,}|(ha){2,}h?|(he){2,}|(rs){2,}|(ksk)+)\b/.test(t) ||
    /\b(piada|pave|trocadilho|charada)\b/.test(t) ||
    /\bo que e o que e\b/.test(t) ||
    /\bsabe (o )?(que|qual) (e|o) (que )?(o )?\w+ (disse|falou)\b/.test(t) ||
    /\bpor ?que a galinha\b/.test(t)
  );
}

/** Resposta de quem achou graça (sem a inteligência na nuvem). */
export function laughLine(seed = Date.now()): string {
  const lines = [
    'Kkkk, essa foi boa!',
    'Haha, essa eu vou guardar para contar no próximo cliente.',
    'Kkk, você está inspirado hoje!',
  ];
  return lines[Math.abs(seed) % lines.length] as string;
}

/** Pedido de desculpas na frente de uma mensagem de erro. */
export function sorry(message: string): string {
  const m = message.trim().replace(/^desculp\w*[,!.]?\s*/i, '');
  if (!m) return 'Desculpa, não consegui fazer isso agora.';
  return `Desculpa, ${m.charAt(0).toLowerCase()}${m.slice(1)}`;
}
