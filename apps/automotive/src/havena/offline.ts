import type { HavenaDeps } from './tools';

/**
 * Comandos fixos da Havena: funcionam sem internet (e respondem na hora mesmo com internet,
 * por serem simples). Pedidos que precisam entender mais (ex.: "coloca o Marcos na rota")
 * ficam para o modelo na nuvem.
 */
const norm = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .trim();

export function fixedCommand(text: string, d: HavenaDeps): string | null {
  const t = norm(text).replace(/^(havena|oi havena|ei havena)\s*/, '');
  if (/^(passa|pula|proxima|avanca)( a)?( (musica|faixa))?$|^proxima (musica|faixa)$/.test(t)) {
    d.proto.next();
    return 'Próxima música.';
  }
  if (/^(volta|anterior|musica anterior|volta a musica)$/.test(t)) {
    d.proto.previous();
    return 'Voltei a música.';
  }
  if (/^(pausa|pausar|para( a musica)?|parar( a musica)?|silencio)$/.test(t)) {
    if (d.proto.playing) d.proto.togglePlaying();
    return 'Música pausada.';
  }
  if (/^(continua|continuar|despausa|volta a tocar|toca|tocar|play)$/.test(t)) {
    if (!d.proto.playing) d.proto.togglePlaying();
    return 'Continuando.';
  }
  if (/^(mostra |abre |abrir )?(a )?rota do dia$/.test(t)) {
    d.stops.showDay();
    return 'Mostrando a rota do dia.';
  }
  const open =
    /^(abre|abrir|vai para|ir para|mostra)( o| a)? (mapa|spotify|musica|kyte|ajustes)$/.exec(t);
  if (open) {
    const where = open[3];
    d.router.replace(
      where === 'mapa'
        ? '/mapa'
        : where === 'kyte'
          ? '/kyte'
          : where === 'ajustes'
            ? '/configuracoes'
            : '/musica',
    );
    return 'Abrindo.';
  }
  return null;
}

/** "sim" / "não" para as confirmações. */
export function yesNo(text: string): boolean | null {
  const t = norm(text);
  if (/^(sim|pode|pode sim|confirma|confirmo|isso|ok|beleza|manda|claro|faz|faca|vai)\b/.test(t))
    return true;
  if (/^(nao|cancela|cancelar|deixa|esquece|para)\b/.test(t)) return false;
  return null;
}
