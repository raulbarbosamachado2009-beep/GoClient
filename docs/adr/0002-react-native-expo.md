# 0002 — Expo/React Native para Mobile e Automotive, como apps separados

**Contexto.** Mobile precisa de Android e iOS; Automotive roda em centrais multimídia Android com
4–8 GB de RAM, tela 1600×900 paisagem. Alternativas consideradas: Kotlin nativo (melhor
desempenho, mas sem reuso com iOS/Web), Flutter (bom desempenho, mas sem reuso de código
TypeScript com Web e API).

**Decisão.** Expo SDK 58 (React Native 0.88, nova arquitetura, Hermes) com Expo Router, em **dois
apps**: `apps/mobile` e `apps/automotive`. Base comum em `packages/native`.

**Por que dois apps e não um com variantes:** experiência própria no Automotive (requisito),
navegação e permissões distintas, bundle menor no hardware limitado e publicação independente
(o Automotive provavelmente será distribuído por APK, não pela Play Store comum).

**Consequências.**
- Reuso de regras, tipos, cliente da API e componentes base entre Mobile, Automotive e Web.
- Preview no navegador para ambos via react-native-web (aproximação; ver `development.md`).
- **Não atende Android Automotive OS de fábrica nem Android Auto**, que exigem apps em templates
  nativos. Se esse mercado virar prioridade, será um app Kotlin separado usando a Car App Library,
  reaproveitando a mesma API.
- Desempenho em centrais de 4 GB precisa ser medido em hardware real na fase de interfaces.
