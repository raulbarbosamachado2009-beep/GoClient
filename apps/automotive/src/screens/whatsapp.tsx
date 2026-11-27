import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { usePhone } from '../layout/form-factor';
import { concentric, useColors } from '../theme';
import { AppIntro, type IntroFeature } from '../ui/app-intro';
import { Presence } from '../ui/motion';
import { Icon, Text, Touchable } from '../ui/primitives';
import { WA_GREEN, WhatsAppLogo } from '../whatsapp/brand';
import type { WhatsAppMessage } from '../whatsapp/bridge';
import { WhatsAppSim } from '../whatsapp/sim/simulated';
import {
  currentDraft,
  type Draft,
  noteWhatsAppLinked,
  setDraft,
  subscribeDraft,
  whatsappLinked,
} from '../whatsapp/store';
import { WhatsAppWindow } from '../whatsapp/window';

const FEATURES: IntroFeature[] = [
  {
    icon: 'chatbubbles',
    title: 'Todas as conversas',
    text: 'O WhatsApp da equipe, completo, dentro do GoClient: conversas, áudios e fotos.',
  },
  {
    icon: 'mic',
    title: 'O Lucas avisa o cliente',
    text: 'Diga "Lucas, avisa o próximo cliente que estamos indo": ele escreve a mensagem com o tempo de chegada.',
  },
  {
    icon: 'shield-checkmark',
    title: 'Do jeito oficial',
    text: 'Você vincula com o QR code, como no computador. Nada sai sem o seu toque em enviar.',
  },
];

/**
 * Aba WhatsApp: o WhatsApp Web dentro do app (como o Kyte), para a equipe usar o número
 * compartilhado. Quando o Lucas prepara um aviso, a conversa abre com a mensagem escrita e
 * uma faixa no topo lembra de tocar em enviar; ao sair a mensagem, o Lucas diz "Enviado!".
 */
export default function WhatsAppScreen() {
  // Preview: WhatsApp simulado, sem login, para refinar o design antes das funções reais.
  if (Platform.OS === 'web') return <WhatsAppSim />;
  return <RealWhatsApp />;
}

function RealWhatsApp() {
  const [open, setOpen] = useState(whatsappLinked);
  const [draft, setLocal] = useState<Draft | null>(currentDraft);
  const [sentTo, setSentTo] = useState<string | null>(null);
  useEffect(() => subscribeDraft(setLocal), []);
  // Um aviso do Lucas abre a conversa mesmo antes de passar pela apresentação.
  useEffect(() => {
    if (draft) setOpen(true);
  }, [draft]);
  // "Enviado" fica um instante na faixa e some.
  useEffect(() => {
    if (!sentTo) return;
    const t = setTimeout(() => setSentTo(null), 3200);
    return () => clearTimeout(t);
  }, [sentTo]);

  if (!open)
    return (
      <AppIntro
        logo={(size) => <WhatsAppLogo size={size} />}
        title="WhatsApp no GoClient"
        lead="Use o WhatsApp da equipe aqui dentro, no celular e na multimídia."
        features={FEATURES}
        button="Conectar o WhatsApp"
        note="No celular dono do número: WhatsApp › Aparelhos conectados › Conectar um aparelho, e leia o QR code. Cada número aceita até 4 aparelhos."
        accent={WA_GREEN}
        onOpen={() => setOpen(true)}
      />
    );

  const onMessage = (m: WhatsAppMessage) => {
    if (m.type === 'wa') {
      noteWhatsAppLinked(m.logged);
      return;
    }
    const d = currentDraft();
    if (!d) return;
    setSentTo(d.to);
    setDraft(null);
    d.onSent?.();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <WhatsAppWindow url={draft?.url ?? null} watchSend={!!draft} onMessage={onMessage} />
      <Presence show={!!draft || !!sentTo} distance={-16} style={styles.bannerWrap}>
        <DraftBanner draft={draft} sentTo={sentTo} onClose={() => setDraft(null)} />
      </Presence>
    </View>
  );
}

const BANNER_R = 32;
const BANNER_PAD = 10;

/** Faixa de vidro no topo: "Mensagem pronta para o Adão: toque em enviar". */
function DraftBanner({
  draft,
  sentTo,
  onClose,
}: {
  draft: Draft | null;
  sentTo: string | null;
  onClose: () => void;
}) {
  const c = useColors();
  const phone = usePhone();
  const sent = !draft && !!sentTo;
  const icon = phone ? 52 : 64;
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: c.material.fallback,
          borderColor: c.material.border,
          padding: BANNER_PAD,
          borderRadius: BANNER_R,
        },
      ]}
    >
      <View
        style={{
          width: icon,
          height: icon,
          borderRadius: concentric(BANNER_R, BANNER_PAD),
          backgroundColor: sent ? c.success : WA_GREEN,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={sent ? 'checkmark' : 'paper-plane'} size={icon * 0.5} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline" numberOfLines={1} style={{ fontSize: phone ? 26 : 28 }}>
          {sent ? `Enviado para ${sentTo}` : `Mensagem pronta para ${draft?.to ?? ''}`}
        </Text>
        {!sent && (
          <Text
            variant="caption"
            tone="secondary"
            numberOfLines={1}
            style={{ fontSize: phone ? 21 : 23 }}
          >
            Confira e toque em enviar no WhatsApp.
          </Text>
        )}
      </View>
      {!sent && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso"
          onPress={onClose}
          scaleTo={0.9}
          style={{
            width: icon,
            height: icon,
            borderRadius: concentric(BANNER_R, BANNER_PAD),
            backgroundColor: c.fill,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={icon * 0.46} color={c.textSecondary} />
        </Touchable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center' },
  banner: {
    width: '92%',
    maxWidth: 900,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
