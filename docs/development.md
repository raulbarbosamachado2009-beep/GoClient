# Desenvolvimento

## Requisitos

- Node.js 22.13+ (ou 24.3+)
- pnpm 10 (`corepack enable` ativa a versão definida em `package.json`)
- Para Android: Android Studio (emulador) ou um dispositivo com depuração USB/Wi-Fi
- Para iOS: macOS com Xcode, ou o app Expo Go num iPhone

## Primeiros passos

```bash
pnpm install
pnpm dev            # API (4000) + Web (3000)
```

Não é preciso configurar banco: em desenvolvimento a API usa PGlite e cria o banco em
`apps/api/.data/pglite`, aplica as migrações e semeia um usuário de desenvolvimento.
Para recomeçar do zero, apague essa pasta.

Arquivos `.env.example` em cada app documentam as variáveis. Copie para `.env` só se precisar
mudar algo.

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | API + Web |
| `pnpm dev:api` | API com recarga automática |
| `pnpm dev:web` | Web (Next.js) |
| `pnpm dev:mobile` | Servidor Expo do Mobile (QR code para celular; `w` abre no navegador) |
| `pnpm dev:automotive` | Servidor Expo do Automotive (`w` abre no navegador) |
| `pnpm check` | Lint + checagem de tipos + testes |
| `pnpm test` | Testes de todos os pacotes |
| `pnpm format` | Formata e organiza imports (Biome) |
| `pnpm db:generate` | Gera migração SQL após alterar `apps/api/src/db/schema.ts` |

## Preview — o que dá para ver, e onde

| Plataforma | No navegador | Fidelidade no navegador | Execução real |
|---|---|---|---|
| Web | `http://localhost:3000` | Total | — |
| Automotive | `http://localhost:8082` (moldura 1600×900 escalada) | Layout e navegação fiéis; **não** reproduz desempenho, memória, toque físico nem módulos nativos | Emulador Android com tela 1600×900 paisagem, ou a central via ADB |
| Mobile | `http://localhost:8081` (redimensione a janela para tamanho de celular) | Boa para layout; **não** reproduz gestos nativos, teclado, câmera, SDKs nativos | Expo Go / build de desenvolvimento no celular; emulador Android; simulador iOS (só macOS) |
| Desktop | Igual à Web, até existir o app Tauri | — | — |

Todas as visualizações atualizam ao salvar um arquivo, sem recarregar a página (testado na Fase 01
para Web e Automotive). **Não** rode o Expo com `CI=1` durante o desenvolvimento: esse modo
desliga a observação de arquivos.

### Preview com IA (fluxo "estilo Lovable")

O arquivo `.claude/launch.json` descreve os quatro servidores (`api`, `web`, `mobile`,
`automotive`). Abrindo esta pasta no **Claude Desktop** (aba Code), o painel **Preview** sobe o
servidor escolhido e mostra o app num navegador integrado enquanto a IA edita o código; com
`autoVerify`, a IA confere visualmente o resultado depois de cada alteração. Para ver o Automotive
ou o Mobile, suba também o `api`.

Fora do Claude Desktop, o mesmo efeito: rode `pnpm dev` + `pnpm dev:automotive` e deixe os
endereços abertos no navegador enquanto trabalha.

### Preview de design compartilhável (Automotive)

```bash
pnpm --filter @goclient/automotive preview:bundle
```

Gera `apps/automotive/dist-preview/index.html`: o app inteiro num único arquivo HTML
(scripts, rotas e fontes de ícones embutidos), que abre sem servidor e funciona dentro de
páginas isoladas — é assim que o Preview de design é publicado para revisão. As telas atuais
usam **dados fictícios** (`apps/automotive/src/mocks/`) e não falam com a API.

### Automotive no emulador Android (fidelidade alta)

1. Android Studio → Device Manager → criar dispositivo → **New Hardware Profile**:
   1600 × 900 px, ~10", orientação paisagem, 4 GB de RAM (o requisito mínimo).
2. Inicie o emulador e rode `pnpm dev:automotive`, depois tecle `a`.
3. Enquanto o app usar só módulos incluídos no Expo Go, ele abre no Expo Go. Quando entrarem
   módulos nativos próprios (ex.: Spotify App Remote), use um build de desenvolvimento:
   `pnpm --filter @goclient/automotive exec expo run:android`.

O app encontra a API automaticamente: no emulador usa `10.0.2.2:4000`; num aparelho na mesma
rede Wi-Fi usa o IP do computador que serve o Expo.

### Automotive numa central multimídia real

1. Ative as opções de desenvolvedor e a depuração USB/Wi-Fi na central (varia por fabricante;
   algumas centrais bloqueiam isso).
2. `adb connect <ip-da-central>:5555` e confirme com `adb devices`.
3. `pnpm dev:automotive` e tecle `a`, ou instale um APK de desenvolvimento.

### Mobile no celular

`pnpm dev:mobile`, depois leia o QR code com o Expo Go (Android) ou a câmera (iOS). O Expo Go
das lojas acompanha a versão de SDK mais recente; se não abrir, use um build de
desenvolvimento (`expo run:android` / `expo run:ios` ou EAS Build).

## Ambientes

- **development**: `GOCLIENT_ENV=development`, banco PGlite local, autenticação `dev`.
- **test**: banco PGlite em memória, criado do zero a cada execução de testes.
- **production**: `GOCLIENT_ENV=production`, `DATABASE_URL` e `GOCLIENT_AUTH_MODE=jwt`
  obrigatórios — a API não inicia sem eles.

Apps Expo leem `EXPO_PUBLIC_API_URL`; a Web lê `NEXT_PUBLIC_API_URL`. Variáveis `EXPO_PUBLIC_*` e
`NEXT_PUBLIC_*` vão para o código do cliente: **nunca** coloque segredos nelas.

## Testes

- `pnpm test` roda Vitest em `core`, `design-tokens` e `api`.
- Testes da API sobem a aplicação completa contra um PostgreSQL real em memória (PGlite) e
  exercitam HTTP → regras → banco.
- A CI (`.github/workflows/ci.yml`) roda lint, tipos, testes, build da Web e bundle dos apps Expo.

Ainda não há testes de interface; entram junto com as primeiras telas (React Native Testing
Library nos apps Expo e Playwright na Web).

## Como adicionar uma funcionalidade

1. **Contrato** — entidade/schema e regras em `packages/core` (com testes).
2. **Banco** — tabela/colunas em `apps/api/src/db/schema.ts`, depois `pnpm db:generate`.
3. **API** — rota em `apps/api/src/app.ts` (ou em um arquivo de rotas do módulo), validando com
   zod e decidindo acesso com `can()`. Teste em `app.test.ts`.
4. **Interface** — consuma pelo cliente tipado (`@goclient/api/client`). Use `GET /v1/me` para
   decidir o que exibir. Componentes visuais só com `@goclient/design-tokens`.
5. `pnpm check` e confira no Preview de cada plataforma afetada.

Se o módulo for sincronizável: adicione a coleção em `SYNC_COLLECTIONS`
(`packages/core/src/sync.ts`) e a tabela em `TABLES` (`apps/api/src/sync/service.ts`).

## APK Android (GoClient Automotive)

- Cada envio para a `main` que mexe em `apps/automotive`, `packages` ou no lockfile dispara o workflow
  `.github/workflows/android-apk.yml`: `expo prebuild` + `gradlew assembleRelease` (arm64-v8a e
  armeabi-v7a), publicado em Releases como `automotive-latest` → `GoClient-Automotive.apk`.
  Também dá para rodar manualmente na aba Actions ("Run workflow").
- Assinatura: chave de depuração padrão do modelo do Expo (igual em toda compilação, então atualizar =
  instalar por cima). Uso familiar; não serve para a Play Store.
- Compilação local validada em 19/11/2026 (JDK 21, SDK 37, NDK 27.1). Com pouca memória, use
  `--max-workers=2 -Pkotlin.compiler.execution.strategy=in-process`.
- Atualizações pelo ar (EAS Update) ficam para quando houver conta Expo.
