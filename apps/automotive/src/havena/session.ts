import { useRouter } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useStops } from '../map/stops';
import { usePrototype } from '../prototype/state';
import { useSpotify } from '../spotify/provider';
import { ask, BRAIN_ENABLED, type Message } from './brain';
import { fixedCommand, yesNo } from './offline';
import { type HavenaDeps, runTool, TOOL_SPECS } from './tools';
import { say, stopVoice, warmVoice } from './voice';

/**
 * Uma conversa com a Havena: ouvir (reconhecimento de voz do aparelho), entender (comandos
 * fixos ou modelo na nuvem), agir (ferramentas, com confirmação para o que muda algo) e
 * responder (voz do aparelho + legenda).
 */
export type Phase = 'listening' | 'thinking' | 'speaking' | 'idle';

const SYSTEM = `Você é a Havena, assistente de voz e agente do app GoClient, usado dirigindo por uma família de vendedores de cosméticos que visita barbearias.
Fale em português do Brasil, em no máximo duas frases curtas (a resposta é falada em voz alta). Nada de listas nem markdown.

Seja um agente: entenda a intenção mesmo com palavras erradas, nomes mal ouvidos pelo reconhecimento de voz, frases incompletas ou gírias, e resolva usando as ferramentas em sequência, sem pedir à pessoa o que você mesmo pode descobrir. Só pergunte quando houver dúvida real entre opções, e então ofereça as opções em uma frase.

Destinos ("me leva até X", "vamos para X", "rota para X"):
- X pode ser um cliente OU um lugar (rua, avenida, bairro, cidade, loja, ponto conhecido). Palavras como rua, avenida, praça, bairro, shopping ou nomes de cidade indicam lugar.
- Se parecer lugar, use lugar_buscar. Se parecer nome de pessoa ou barbearia, use cliente_buscar; se não achar cliente, tente lugar_buscar antes de desistir (e vice-versa).
- Com o resultado, use rota_colocar copiando o endereço exatamente como a ferramenta devolveu, sem cortar nada.
- agora=true só quando a pessoa quer ir já ("me leva", "vamos", "bora", "agora", "ir até"). "Coloca na rota" ou "adiciona na rota" é agora=false (rota do dia).
- Se lugar_buscar devolver opções em cidades diferentes, prefira a mais perto do carro (km_do_carro) e diga qual escolheu.
- Se cliente_buscar devolver "parecidos", pergunte se é um deles (ex.: "Você quis dizer Barbearia do Adilson?").

Para pôr um cliente na rota ou mandar WhatsApp, use o endereço/telefone que cliente_buscar devolver; nunca invente endereço nem telefone. Se vierem vários, pergunte qual. Se o cliente não tiver endereço, diga que é preciso cadastrar o endereço no Kyte.`;

type Pending = { summary: string; run: () => Promise<string> };

export function useHavenaSession(open: boolean) {
  const spotify = useSpotify();
  const proto = usePrototype();
  const stops = useStops();
  const router = useRouter();
  const deps = useRef<HavenaDeps>({ spotify, proto, stops, router });
  deps.current = { spotify, proto, stops, router };

  const [phase, setPhase] = useState<Phase>('idle');
  const [caption, setCaption] = useState('');
  const [heard, setHeard] = useState('');
  const pending = useRef<Pending | null>(null);
  const [awaiting, setAwaiting] = useState(false);
  const history = useRef<Message[]>([]);
  const alive = useRef(true);

  const speak = useCallback((text: string, then?: () => void) => {
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
    const finish = () => {
      clearTimeout(fallback);
      show();
      if (!alive.current) return;
      if (then) then();
      else setPhase('idle');
    };
    say(text, {
      onStart: () => {
        clearTimeout(fallback);
        show();
      },
      onDone: finish,
      onStopped: () => {
        clearTimeout(fallback);
        if (alive.current) setPhase('idle');
      },
    });
  }, []);

  const listen = useCallback(async () => {
    if (Platform.OS === 'web' && !('webkitSpeechRecognition' in globalThis)) {
      setCaption('No Preview a Havena não ouve. No app instalado, é só falar.');
      setPhase('idle');
      return;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
    if (!perm?.granted) {
      setCaption('Preciso do microfone para ouvir você. Libere em Ajustes do aparelho.');
      setPhase('idle');
      return;
    }
    setHeard('');
    setCaption('Ouvindo…');
    setPhase('listening');
    ExpoSpeechRecognitionModule.start({
      lang: 'pt-BR',
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
      // Outras formas de entender a mesma fala (nomes e ruas costumam sair errados).
      maxAlternatives: 3,
    });
  }, []);

  // Ouve logo depois de falar (um instante para o alto-falante liberar o áudio).
  const autoListen = useRef(false);
  const listenSoon = useCallback(() => {
    autoListen.current = true;
    setTimeout(() => {
      if (alive.current) void listen();
    }, 350);
  }, [listen]);

  const confirmFlow = useCallback(
    (p: Pending) => {
      pending.current = p;
      setAwaiting(true);
      speak(p.summary, () => listenSoon());
    },
    [speak, listenSoon],
  );

  const answer = useCallback(
    async (text: string, alternatives: string[] = []) => {
      setHeard(text);
      // Resposta a uma confirmação pendente.
      if (pending.current) {
        const yn = yesNo(text);
        const p = pending.current;
        if (yn === null) return speak('Não entendi. Diga sim ou não.', () => listenSoon());
        pending.current = null;
        setAwaiting(false);
        if (!yn) return speak('Tudo bem, cancelei.');
        setPhase('thinking');
        setCaption('Fazendo…');
        try {
          return speak(await p.run());
        } catch (e) {
          return speak(e instanceof Error ? e.message : 'Não consegui fazer isso agora.');
        }
      }
      // Comandos fixos (instantâneos e sem internet).
      const quick = fixedCommand(text, deps.current);
      if (quick) return speak(quick);
      if (!BRAIN_ENABLED)
        return speak(
          'Sem a inteligência na nuvem, eu só entendo comandos simples, como passar a música.',
        );

      setPhase('thinking');
      setCaption('Pensando…');
      const msgs: Message[] = [
        { role: 'system', content: SYSTEM },
        ...history.current.slice(-8),
        {
          role: 'user',
          content: alternatives.length
            ? `${text}\n(o reconhecimento de voz também entendeu: ${alternatives.map((a) => `"${a}"`).join(', ')})`
            : text,
        },
      ];
      try {
        for (let round = 0; round < 4; round++) {
          const r = await ask(msgs, TOOL_SPECS);
          if (!r.calls.length) {
            history.current = [...msgs.slice(1), r.raw];
            // Depois de responder, já escuta de novo: a pessoa pode responder a uma pergunta
            // dela ou continuar a conversa (se ficar em silêncio, ela só para de ouvir).
            return speak(r.text || 'Pronto.', () => listenSoon());
          }
          msgs.push(r.raw);
          for (const call of r.calls) {
            setCaption('Trabalhando nisso…');
            const out = await runTool(call.name, call.args, deps.current).catch(
              (e: Error) => ({ result: `erro: ${e.message}` }) as const,
            );
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
        return speak('Estou sem conexão com a inteligência agora. Tente um comando simples.');
      }
    },
    [speak, confirmFlow, listenSoon],
  );

  useSpeechRecognitionEvent('result', (e) => {
    const t = e.results[0]?.transcript ?? '';
    setHeard(t);
    if (e.isFinal && t.trim()) {
      autoListen.current = false;
      ExpoSpeechRecognitionModule.stop();
      const alts = e.results
        .slice(1)
        .map((r) => r.transcript.trim())
        .filter((a) => a && a !== t.trim());
      void answer(t, alts);
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (!alive.current) return;
    setPhase('idle');
    // Escuta automática depois da fala dela: silêncio não é erro, mantém a última frase.
    if (autoListen.current && (e.error === 'no-speech' || e.error === 'speech-timeout')) {
      autoListen.current = false;
      return;
    }
    setCaption(
      e.error === 'no-speech' || e.error === 'speech-timeout'
        ? 'Não ouvi nada. Toque no círculo para falar.'
        : 'Não consegui ouvir agora. Toque no círculo para tentar de novo.',
    );
  });

  // Abriu: já começa ouvindo. Fechou: para tudo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só na abertura/fechamento
  useEffect(() => {
    alive.current = open;
    if (open) {
      warmVoice();
      void listen();
    } else {
      stopVoice();
      ExpoSpeechRecognitionModule.abort?.();
    }
    return () => {
      alive.current = false;
      stopVoice();
      ExpoSpeechRecognitionModule.abort?.();
    };
  }, [open]);

  return {
    phase,
    caption,
    heard,
    awaiting,
    /** Toque no círculo: fala de novo (ou interrompe a fala). */
    talk: () => {
      if (phase === 'speaking') stopVoice();
      void listen();
    },
    /** Botões Sim/Não da confirmação. */
    reply: (yes: boolean) => void answer(yes ? 'sim' : 'não'),
  };
}
