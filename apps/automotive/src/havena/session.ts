import {
  answerClock,
  matchWakePhrase,
  nowContext,
  parseNotifyRequest,
  stripWakePhrase,
} from '@goclient/core';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useStops } from '../map/stops';
import { usePrototype } from '../prototype/state';
import { ask, BRAIN_ENABLED, type Message } from './brain';
import { useContinuousListener } from './listener';
import { isJoke, laughLine, type Mood, sorry } from './mood';
import { planNotify } from './notify';
import { fixedCommand, yesNo } from './offline';
import { type Done, type HavenaDeps, runTool, TOOL_SPECS } from './tools';
import { say, stopVoice, warmVoice } from './voice';

/**
 * Uma conversa com o Lucas: ouvir (reconhecimento de voz do aparelho), entender (comandos
 * fixos ou modelo na nuvem), agir (ferramentas, com confirmação para o que muda algo) e
 * responder (voz do aparelho + legenda).
 *
 * A conversa não tem fim: depois de ativado, o Lucas fica ouvindo até a pessoa fechar. Ele só
 * desliga o microfone enquanto pensa e fala (para não ouvir a própria voz) e volta a ouvir
 * logo depois. Tocar no círculo enquanto ele fala interrompe e já abre o microfone.
 */
export type Phase = 'listening' | 'thinking' | 'speaking' | 'idle';

const SYSTEM = `Você é o Lucas, assistente de voz e agente do app GoClient, usado dirigindo por uma família de vendedores de cosméticos que visita barbearias.
Você é homem; fale de si no masculino. Fale em português do Brasil, em no máximo duas frases curtas (a resposta é falada em voz alta). Nada de listas nem markdown.

Seja um agente: entenda a intenção mesmo com palavras erradas, nomes mal ouvidos pelo reconhecimento de voz, frases incompletas ou gírias, e resolva usando as ferramentas em sequência, sem pedir à pessoa o que você mesmo pode descobrir. Só pergunte quando houver dúvida real entre opções, e então ofereça as opções em uma frase.

Destinos ("me leva até X", "vamos para X", "rota para X"):
- X pode ser um cliente OU um lugar (rua, avenida, bairro, cidade, loja, ponto conhecido). Palavras como rua, avenida, praça, bairro, shopping ou nomes de cidade indicam lugar.
- Se parecer lugar, use lugar_buscar. Se parecer nome de pessoa ou barbearia, use cliente_buscar; se não achar cliente, tente lugar_buscar antes de desistir (e vice-versa).
- Com o resultado, use rota_colocar copiando o endereço exatamente como a ferramenta devolveu, sem cortar nada.
- agora=true só quando a pessoa quer ir já ("me leva", "vamos", "bora", "agora", "ir até"). "Coloca na rota" ou "adiciona na rota" é agora=false (rota do dia).
- Se lugar_buscar devolver opções em cidades diferentes, prefira a mais perto do carro (km_do_carro) e diga qual escolheu.
- Se cliente_buscar devolver "parecidos", pergunte se é um deles (ex.: "Você quis dizer Barbearia do Adilson?").

Avisos de chegada ("avisa o próximo cliente que estamos indo", "avisa o Adão do Jardim Selma que chego em 10 minutos"): use avisar_chegada (sem nome = próximo da rota). Não escreva a mensagem você mesmo: o app escreve e pergunta antes.

Se a pessoa contar uma piada, ria ("kkkk") e responda com bom humor em uma frase. Se uma ferramenta der erro, comece pedindo desculpas ("Desculpa, …") e diga o que deu errado em poucas palavras.

Para pôr um cliente na rota ou mandar WhatsApp, use o endereço/telefone que cliente_buscar devolver; nunca invente endereço nem telefone. Se vierem vários, pergunte qual. Se o cliente não tiver endereço, diga que é preciso cadastrar o endereço no Kyte.`;

type Pending = { summary: string; run: () => Promise<Done> };

/** Primeiras palavras quando o Lucas é chamado pela voz (ex.: "olá Lucas, que horas são"). */
export interface WakeStart {
  rest: string;
  greeting: string;
}

/** Resposta quando a pessoa só chamou o Lucas ("bom dia" ganha bom dia de volta). */
const greet = (greeting?: string) =>
  greeting === 'Bom dia!' ? 'Bom dia! Pode falar.' : 'Oi! Pode falar.';

export function useHavenaSession(open: boolean, wakeStart?: WakeStart) {
  const proto = usePrototype();
  const stops = useStops();
  const router = useRouter();
  const deps = useRef<HavenaDeps>({ proto, stops, router });
  deps.current = { proto, stops, router };

  const [phase, setPhase] = useState<Phase>('idle');
  // Humor da resposta atual (rindo de uma piada ou triste com um erro).
  const [mood, setMood] = useState<Mood>(null);
  const [caption, setCaption] = useState('');
  const [heard, setHeard] = useState('');
  const pending = useRef<Pending | null>(null);
  const [awaiting, setAwaiting] = useState(false);
  const history = useRef<Message[]>([]);
  const alive = useRef(true);
  const busy = useRef(false);
  const answerRef = useRef<(text: string, alternatives?: string[]) => Promise<void>>(
    async () => {},
  );

  const mic = useContinuousListener('session', {
    onPartial: (t) => {
      if (busy.current) return;
      setHeard(t);
    },
    onUtterance: (t, alts) => {
      if (busy.current) return;
      void answerRef.current(t, alts);
    },
    onProblem: (p) => {
      if (!alive.current) return;
      setPhase('idle');
      setMood('sad');
      setCaption(
        p === 'permission'
          ? 'Preciso do microfone para ouvir você. Libere em Ajustes do aparelho.'
          : 'Não consegui ouvir agora. Toque no círculo para tentar de novo.',
      );
    },
  });

  /** Volta a ouvir (a conversa continua até a pessoa fechar). */
  const listen = useCallback(() => {
    if (!alive.current) return;
    busy.current = false;
    if (Platform.OS === 'web' && !('webkitSpeechRecognition' in globalThis)) {
      setCaption('No Preview o Lucas não ouve. No app instalado, é só falar.');
      setPhase('idle');
      return;
    }
    setHeard('');
    setMood(null);
    setPhase('listening');
    mic.start();
  }, [mic]);

  const speak = useCallback(
    (text: string, then?: () => void, feeling: Mood = null) => {
      // Enquanto fala, o microfone fica desligado para não ouvir a própria voz.
      busy.current = true;
      mic.pause();
      setMood(feeling);
      setPhase('speaking');
      // O texto aparece quando a voz começa (ou em 500 ms, se o aparelho não avisar), para
      // as palavras e a fala andarem juntas.
      let shown = false;
      const show = () => {
        if (shown || !alive.current) return;
        shown = true;
        setCaption(text);
      };
      const fallback = setTimeout(show, 500);
      // Depois de falar, volta a ouvir (um instante para o alto-falante liberar o áudio).
      const after = () => setTimeout(listen, 350);
      say(text, {
        onStart: () => {
          clearTimeout(fallback);
          show();
        },
        onDone: () => {
          clearTimeout(fallback);
          show();
          if (!alive.current) return;
          if (then) then();
          else after();
        },
        // Interrompido (toque no círculo): quem interrompeu já reabre o microfone.
        onStopped: () => clearTimeout(fallback),
      });
    },
    [mic, listen],
  );

  /** Fala sem voltar a ouvir no fim (a conversa continua logo em seguida). */
  const sayAndWait = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        busy.current = true;
        mic.pause();
        setPhase('speaking');
        setCaption(text);
        say(text, { onStart: () => {}, onDone: resolve, onStopped: resolve });
        // Sem aviso do motor de voz (ex.: Preview), segue mesmo assim.
        setTimeout(resolve, 2500);
      }),
    [mic],
  );

  const think = useCallback(
    (label: string) => {
      busy.current = true;
      mic.pause();
      setPhase('thinking');
      setCaption(label);
    },
    [mic],
  );

  const confirmFlow = useCallback(
    (p: Pending) => {
      pending.current = p;
      setAwaiting(true);
      speak(p.summary);
    },
    [speak],
  );

  const answer = useCallback(
    async (said: string, alternatives: string[] = []) => {
      // "Olá Lucas, ..." no meio da conversa: só o pedido importa.
      const wake = matchWakePhrase(said);
      const text = wake ? wake.rest : said.trim();
      setHeard(said);
      if (!text) return speak(greet(wake?.greeting));
      // Resposta a uma confirmação pendente.
      if (pending.current) {
        const yn = yesNo(text);
        const p = pending.current;
        if (yn === null) return speak('Não entendi. Diga sim ou não.');
        pending.current = null;
        setAwaiting(false);
        if (!yn) return speak('Tudo bem, cancelei.');
        think('Fazendo…');
        try {
          const done = await p.run();
          return typeof done === 'string' ? speak(done) : speak(done.say, done.after);
        } catch (e) {
          return speak(sorry(e instanceof Error ? e.message : ''), undefined, 'sad');
        }
      }
      // Hora e data: na hora, sem internet.
      const clock = answerClock(text, new Date());
      if (clock) return speak(clock);
      // "Avisa o próximo cliente que estamos indo": entende na hora, sem internet. Enquanto
      // diz "Só um segundo!", já acha o cliente e o tempo; depois pergunta antes de mandar.
      const notify = parseNotifyRequest(text);
      if (notify) {
        const wait = sayAndWait('Só um segundo!');
        let failed = false;
        const plan = await planNotify(notify, deps.current).catch(() => {
          failed = true;
          return { result: 'Não consegui preparar o aviso agora.' } as const;
        });
        await wait;
        if (!alive.current) return;
        if ('confirm' in plan) return confirmFlow(plan.confirm);
        return failed
          ? speak(sorry(String(plan.result)), undefined, 'sad')
          : speak(String(plan.result));
      }
      // Comandos fixos (instantâneos e sem internet).
      const quick = fixedCommand(text, deps.current);
      if (quick) return speak(quick);
      // Piada: ele ri junto (com a nuvem, responde à piada; sem ela, só ri).
      const joke = isJoke(text);
      if (joke && !BRAIN_ENABLED) return speak(laughLine(), undefined, 'joke');
      if (!BRAIN_ENABLED)
        return speak(
          'Sem a inteligência na nuvem, eu só entendo comandos simples, como abrir o mapa, mostrar a rota do dia ou dizer as horas.',
        );

      think('Pensando…');
      const msgs: Message[] = [
        { role: 'system', content: `${SYSTEM}\n\n${nowContext(new Date())}` },
        ...history.current.slice(-8),
        {
          role: 'user',
          content: alternatives.length
            ? `${text}\n(o reconhecimento de voz também entendeu: ${alternatives.map((a) => `"${stripWakePhrase(a)}"`).join(', ')})`
            : text,
        },
      ];
      let toolFailed = false;
      try {
        for (let round = 0; round < 4; round++) {
          const r = await ask(msgs, TOOL_SPECS);
          if (!r.calls.length) {
            history.current = [...msgs.slice(1), r.raw];
            const feeling: Mood = toolFailed ? 'sad' : joke ? 'joke' : null;
            const said = r.text || 'Pronto.';
            return speak(toolFailed ? sorry(said) : said, undefined, feeling);
          }
          msgs.push(r.raw);
          for (const call of r.calls) {
            setCaption('Trabalhando nisso…');
            const out = await runTool(call.name, call.args, deps.current).catch((e: Error) => {
              toolFailed = true;
              return { result: `erro: ${e.message}` } as const;
            });
            if ('confirm' in out) {
              history.current = [...msgs.slice(1)];
              return confirmFlow(out.confirm);
            }
            msgs.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify(out.result),
            });
          }
        }
        return speak('Pronto.');
      } catch {
        return speak(
          'Desculpa, estou sem conexão com a inteligência agora. Tente um comando simples.',
          undefined,
          'sad',
        );
      }
    },
    [speak, think, confirmFlow, sayAndWait],
  );
  answerRef.current = answer;

  // Abriu: já começa ouvindo (ou já responde, se foi chamado pela voz). Fechou: para tudo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só na abertura/fechamento
  useEffect(() => {
    alive.current = open;
    if (open) {
      warmVoice();
      if (wakeStart) {
        // Toma o microfone já (a escuta da ativação para) e responde ao que veio junto.
        mic.start();
        if (wakeStart.rest) void answer(wakeStart.rest);
        else speak(greet(wakeStart.greeting));
      } else listen();
    } else {
      stopVoice();
      mic.release();
    }
    return () => {
      alive.current = false;
      stopVoice();
      mic.release();
    };
  }, [open]);

  return {
    phase,
    mood,
    caption,
    heard,
    awaiting,
    /** Toque no círculo: interrompe a fala e ouve na hora. */
    talk: () => {
      if (phase === 'speaking') stopVoice();
      listen();
    },
    /** Botões Sim/Não da confirmação. */
    reply: (yes: boolean) => void answer(yes ? 'sim' : 'não'),
  };
}
