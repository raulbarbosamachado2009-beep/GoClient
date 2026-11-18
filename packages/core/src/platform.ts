/**
 * Plataformas do ecossistema. Toda requisição à API declara a plataforma de origem
 * (cabeçalho `x-goclient-platform`), e as regras de permissão levam isso em conta.
 */
export const PLATFORMS = ['automotive', 'mobile', 'web', 'desktop'] as const;
export type Platform = (typeof PLATFORMS)[number];

/**
 * Canal pelo qual uma operação foi iniciada.
 * - `manual`: o usuário operou a interface diretamente.
 * - `havena`: a assistente executou a operação em nome do usuário.
 * - `integration`: um processo de integração (ex.: importação da Kyte).
 */
export const CHANNELS = ['manual', 'havena', 'integration'] as const;
export type Channel = (typeof CHANNELS)[number];

export const PLATFORM_HEADER = 'x-goclient-platform';

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (PLATFORMS as readonly string[]).includes(value);
}
