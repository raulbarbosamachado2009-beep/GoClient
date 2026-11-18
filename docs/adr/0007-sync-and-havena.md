# 0007 — Sincronização por versão global; Havena por ferramentas

## Sincronização

**Contexto.** Representantes trabalham com sinal instável. Ferramentas prontas avaliadas:
PowerSync e ElectricSQL (sincronização Postgres ↔ SQLite gerenciada), WatermelonDB (banco local
com protocolo próprio). Todas resolvem bem a cópia de dados, mas passar escritas por elas
dificultaria aplicar as regras de negócio (Regras 1 e 2, papéis) num ponto central.

**Decisão.** Protocolo próprio e pequeno (`packages/core/src/sync.ts`): `pull` por cursor
(sequência global do PostgreSQL) e `push` de mutações idempotentes, validadas pelo mesmo `can()`
da API. Conflito por versão base, com o servidor vencendo e avisando o usuário.

**Consequências.** Controle total das regras; menos dependências. Em troca, o motor do cliente
(fila, retentativas, sincronização em segundo plano) é código nosso — próxima fase. Se o volume
crescer muito, a leitura (`pull`) pode migrar para PowerSync/Electric mantendo o `push` na API.

## Havena

**Contexto.** A assistente deve consultar e operar o sistema por voz e texto, com modelos locais
ou em nuvem.

**Decisão.** A Havena só age por **ferramentas** declaradas (`havenaTools`), autorizadas por
`can()` no canal `havena`; escritas exigem confirmação. O modelo fica atrás de
`HavenaModelProvider`.

**Modelos locais no Automotive (estimativa a validar em hardware).** Um modelo de linguagem
pequeno e quantizado ocupa na faixa de 1–2 GB de RAM, o que é inviável junto com o app numa
central de 4 GB. Proposta: modelo em nuvem por padrão; no aparelho, apenas detecção de palavra de
ativação e, se viável, transcrição de voz; modelo local opcional em centrais de 8 GB, sem
conexão.
