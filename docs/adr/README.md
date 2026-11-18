# Registros de decisões de arquitetura (ADRs)

Cada decisão importante tem um arquivo curto: contexto, decisão e consequências. Decisões não
são apagadas; quando mudam, uma nova ADR substitui a anterior.

| # | Decisão | Estado |
|---|---|---|
| [0001](0001-monorepo.md) | Monorepo com pnpm + Turborepo | Aceita |
| [0002](0002-react-native-expo.md) | Expo/React Native para Mobile e Automotive, como apps separados | Aceita |
| [0003](0003-nextjs-web.md) | Next.js para a Web | Aceita |
| [0004](0004-desktop-tauri.md) | Desktop com Tauri sobre a Web, adiado | Proposta |
| [0005](0005-api-postgres.md) | API própria (Hono) + PostgreSQL + Drizzle; PGlite em dev | Aceita |
| [0006](0006-auth.md) | Autenticação por JWT/OIDC validado na API | Aceita (provedor a escolher) |
| [0007](0007-sync-and-havena.md) | Sincronização por versão global; Havena por ferramentas | Aceita |
