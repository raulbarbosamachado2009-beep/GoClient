# 0005 — API própria (Hono) + PostgreSQL + Drizzle; PGlite em desenvolvimento

**Contexto.** As regras 1–3 precisam valer igualmente para todas as plataformas e para a Havena.
Alternativa considerada: Backend-as-a-Service com acesso direto do app ao banco (ex.: Supabase
com regras de segurança por linha). Funciona para CRUD simples, mas espalharia regras de negócio
entre políticas SQL e os apps, e a Havena precisaria de um servidor de qualquer forma.

**Decisão.**
- **API própria em TypeScript com Hono**: leve, padrões Web (`Request`/`Response`), roda em Node e
  em plataformas serverless, e oferece cliente RPC tipado.
- **PostgreSQL**: relacional (clientes, produtos, rotas e visitas têm relações fortes), JSONB
  para dados flexíveis, extensões geoespaciais (PostGIS) disponíveis para a fase de Rotas,
  oferta gerenciada abundante (Supabase, Neon, RDS).
- **Drizzle ORM**: schema em TypeScript, SQL previsível, migrações versionadas.
- **PGlite** em desenvolvimento e testes: PostgreSQL de verdade sem Docker.

**Consequências.**
- Uma única porta de escrita; regras testáveis ponta a ponta.
- Precisamos operar um serviço (deploy, logs, escala). Hospedagem a definir no primeiro deploy.
- PGlite não substitui todos os recursos de um servidor (ex.: algumas extensões e conexões
  concorrentes); testes de carga e de extensões devem rodar contra PostgreSQL real.
