import { toCssVariables } from '@goclient/design-tokens';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'GoClient',
  description: 'Gestão comercial para representantes e vendedores externos.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Tokens de design compartilhados, expostos como variáveis CSS. */}
        <style>{`:root{${toCssVariables()}}`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
