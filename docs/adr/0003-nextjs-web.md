# 0003 — Next.js para a Web

**Contexto.** A Web é a plataforma de gestão mais completa (cadastros em massa, relatórios,
configurações). Alternativas: Vite + React (SPA simples), Expo Web (reuso total de telas do
Mobile).

**Decisão.** Next.js 16 (App Router), consumindo `@goclient/core`, `@goclient/design-tokens` e o
cliente tipado da API. Toda regra de negócio fica na API; o Next não acessa o banco.

**Por que não Expo Web:** a Web terá telas densas (tabelas, filtros, edição em massa) que não
fazem sentido no celular; compartilhar telas forçaria um meio-termo ruim nas duas. O reuso
acontece nas regras, dados e tokens.

**Consequências.** Rotas, layouts e renderização no servidor prontos; deploy simples (Vercel ou
Node). Componentes visuais da Web são DOM/CSS, separados dos componentes React Native.
