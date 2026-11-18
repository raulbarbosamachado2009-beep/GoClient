# 0001 — Monorepo com pnpm + Turborepo

**Contexto.** Quatro aplicações compartilham regras de negócio, tipos, tokens visuais e o
contrato da API. Em repositórios separados, cada mudança de contrato exigiria publicar pacotes e
sincronizar versões manualmente.

**Decisão.** Um monorepo: `apps/` (api, web, mobile, automotive) e `packages/` (core,
design-tokens, native). pnpm workspaces para dependências, Turborepo para orquestrar tarefas com
cache, Biome para lint e formatação (uma ferramenta, rápida, sem plugins), TypeScript em todo
lugar. Pacotes internos são consumidos como código-fonte TypeScript, sem etapa de build.

**Consequências.**
- Uma mudança na API quebra a checagem de tipos dos apps no mesmo commit — erro visto cedo.
- Uma única versão de React em todo o repositório (exigência do React Native), garantida por
  `overrides` em `pnpm-workspace.yaml`.
- Biome não tem as regras específicas de Next/React Native que o ESLint tem (ex.: regras de
  hooks específicas do Next). Se fizerem falta, ESLint pode ser adicionado só nesses apps.
