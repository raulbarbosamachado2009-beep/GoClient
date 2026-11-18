import { EnvironmentCheck } from './environment-check';

/**
 * Página de diagnóstico do ambiente de desenvolvimento.
 * NÃO é uma tela do produto: será substituída quando as interfaces forem aprovadas.
 */
export default function Home() {
  return (
    <main
      style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--gc-space-12) var(--gc-space-6)' }}
    >
      <p style={{ color: 'var(--gc-color-text-tertiary)', fontSize: 13, margin: 0 }}>
        Diagnóstico do ambiente · Web
      </p>
      <h1
        style={{ fontSize: 34, fontWeight: 600, margin: 'var(--gc-space-2) 0 var(--gc-space-8)' }}
      >
        GoClient
      </h1>
      <EnvironmentCheck />
    </main>
  );
}
