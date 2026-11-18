# GoClient — instruções para agentes de IA

Leia `docs/architecture.md` antes de propor mudanças estruturais.

## Regras do projeto

- Desenvolvimento por fases. Não crie telas do produto sem aprovação da arquitetura/design da fase.
- Regras de negócio vivem em `packages/core` e são aplicadas **na API** (autoritativa) e nas interfaces (para esconder/desabilitar ações). Nunca implemente uma regra só na interface.
- Toda escrita de dados passa pela API (`apps/api`). Aplicativos não acessam o banco diretamente.
- Regra 1: no Automotive não há criação/edição manual de clientes e produtos. Regra 2: a Havena pode fazê-lo, com confirmação do usuário. Ambas estão em `can()` (`packages/core/src/permissions.ts`) e têm testes.
- Não invente integrações. Kyte e Spotify têm limitações documentadas em `docs/integrations.md`.
- Visual: use apenas `@goclient/design-tokens`. Sem gradientes, neon ou decoração. Escuro por padrão.

## Comandos

- `pnpm check` — lint + typecheck + testes (rode antes de concluir qualquer tarefa).
- `pnpm format` — formata com Biome.
- Pacotes Expo: `pnpm --filter @goclient/<app> exec expo install <pacote>` (nunca `pnpm add` para pacotes nativos).
- Migrações: altere `apps/api/src/db/schema.ts` e rode `pnpm db:generate`.

## Preview

`.claude/launch.json` define os servidores (api, web, mobile, automotive). Ao alterar UI, suba o
servidor da plataforma afetada e confira o resultado visualmente. Não use `CI=1` ao rodar o Expo
em desenvolvimento: isso desliga o recarregamento automático.
