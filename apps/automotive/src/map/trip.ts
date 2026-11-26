/**
 * Viagem em andamento, contada pelo Mapa para quem precisa dela fora da tela (o Lucas, para
 * avisar o próximo cliente). O Mapa publica sempre que a parada ou o tempo mudam.
 */
export interface TripStop {
  name: string;
  /** Bairro (pode vir vazio quando o cadastro do Kyte não tem). */
  district: string;
  phone: string;
}

export interface ActiveTrip {
  /** Próxima parada da rota (ou o cliente escolhido no Mapa). */
  next: TripStop;
  /** Segundos até chegar nela, pela rota calculada (null quando ainda não há rota). */
  secondsToNext: number | null;
  navigating: boolean;
  /** Quando foi publicado (para descontar o tempo passado desde então). */
  at: number;
}

let current: ActiveTrip | null = null;

export function publishTrip(t: ActiveTrip | null) {
  current = t;
}

/** Viagem atual, com o tempo de chegada descontando o que já passou desde a publicação. */
export function getTrip(now = Date.now()): ActiveTrip | null {
  if (!current) return null;
  const passed = (now - current.at) / 1000;
  const left = current.secondsToNext === null ? null : Math.max(60, current.secondsToNext - passed);
  return { ...current, secondsToNext: left };
}

/**
 * Bairro de um cadastro. Os clientes de exemplo têm "Bairro · Cidade"; os do Kyte costumam
 * trazer o bairro no endereço ("Rua X, 120 - Jardim Selma, Campinas").
 */
export function districtOf(c: { district?: string; address?: string }): string {
  const d = c.district?.split('·')[0]?.trim();
  if (d) return d;
  const dash = c.address?.split(' - ')[1]?.split(',')[0]?.trim();
  return dash ?? '';
}
