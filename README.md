# GoClient

Ecossistema de gestão comercial para representantes comerciais e vendedores externos:
clientes, produtos, rotas de visita, música e a assistente **Havena**, em quatro ambientes
(Automotive, Mobile, Web e Desktop) sobre a mesma base de dados e regras.

> **Fase atual: 01 — fundação técnica.** Não há telas do produto ainda; cada app tem apenas uma
> tela de diagnóstico que comprova a comunicação com a API e as regras compartilhadas.

## Início rápido

```bash
corepack enable
pnpm install
pnpm dev              # API em :4000 e Web em :3000
pnpm dev:automotive   # Automotive (tecle "w" para abrir no navegador em :8082)
pnpm dev:mobile       # Mobile (QR code para o celular, ou "w" para o navegador em :8081)
pnpm check            # lint + tipos + testes
```

Nenhum banco precisa ser instalado: em desenvolvimento a API usa PostgreSQL embutido (PGlite).

## Estrutura

```
apps/
  api/          API central (Hono + Drizzle + PostgreSQL)
  web/          GoClient Web (Next.js)
  mobile/       GoClient Mobile (Expo, Android/iOS)
  automotive/   GoClient Automotive (Expo, centrais Android 1600×900)
packages/
  core/            regras de negócio, entidades, permissões, sincronização, Havena
  design-tokens/   cores, tipografia, espaçamento e movimento
  native/          base React Native compartilhada por Mobile e Automotive
docs/
  architecture.md  arquitetura completa
  development.md   como rodar, Preview por plataforma, testes, novas funcionalidades
  integrations.md  Kyte, Spotify, WhatsApp, mapas — viabilidade e limites
  adr/             decisões de arquitetura
```

## Documentação

- [Arquitetura](docs/architecture.md)
- [Desenvolvimento e Preview](docs/development.md)
- [Integrações](docs/integrations.md)
- [Decisões (ADRs)](docs/adr/README.md)
