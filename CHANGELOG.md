# Registro de mudanças do GoClient

Toda alteração no projeto entra aqui, com data e hora (horário de Brasília). Leia este
arquivo antes de começar um trabalho.

## Estado atual do app

_Última atualização: 24/11/2026, 09:30 (BRT)._

- O trabalho real está em `main` e quase todo no **Automotive** (`apps/automotive`, Expo):
  Kyte por dentro de uma página, Spotify (App Remote), mapa OpenStreetMap + OpenRouteService e
  o assistente de voz. Mobile e Web ainda são telas de diagnóstico.
- O assistente agora se chama **Lucas**, com voz masculina do aparelho (voz gerada por IA fica
  para depois). Ele ouve sem parar depois de ativado, responde hora e data sem internet e é
  chamado por "olá Lucas", "bom dia", "oh IA" ou "olá, inteligência artificial".
- Em andamento em outras frentes: design interno, onboarding e login, função "Rota" no card do
  cliente, Spotify (reprodução e dados do player) e botões maiores no Kyte da multimídia.

## 24/11/2026, 09:30 (BRT) — Assistente vira Lucas

- **Nome:** "Havena" → "Lucas" em todos os textos do app (painel, Ajustes, onboarding,
  permissões do microfone, botões de cadastro no Kyte e instruções do modelo de IA). No código,
  a pasta `havena/` e o canal `havena` das permissões continuam com o nome antigo.
- **Voz masculina:** escolhe uma voz pt-BR masculina instalada no aparelho
  (`pickAssistantVoice` em `packages/core/src/assistant.ts`); sem nenhuma, usa a padrão com
  tom mais grave.
- **Transcrição:** a fala da pessoa aparece inteira e na hora em que é ouvida. Antes a legenda
  recomeçava a cada palavra nova e a frase era cortada no primeiro trecho ("bom" de "bom dia").
  Agora os trechos são juntados e a frase só segue depois de ~1 s de silêncio
  (`havena/listener.ts`).
- **Hora e data:** "que horas são", "que dia é hoje", "que dia da semana", mês e ano são
  respondidos na hora, sem internet (`answerClock`). O modelo de IA também recebe a data e a
  hora de agora.
- **Conversa sem limite:** depois de ativado, o Lucas continua ouvindo até a pessoa fechar o
  painel, mesmo depois de responder ou de um silêncio. O microfone só desliga enquanto ele
  pensa e fala; tocar no círculo interrompe a fala.
- **Ativação por voz:** a chave "Ativar com…" em Ajustes antes não fazia nada. Agora, com o
  app aberto e o Lucas fechado, ele atende a "olá/oi/ei Lucas", "bom dia", "oh IA" e "olá,
  inteligência artificial", e já responde ao que vier junto. A escolha fica salva no aparelho.
- Testes novos em `packages/core/src/assistant.test.ts` (ativação, transcrição, hora/data,
  escolha de voz).
