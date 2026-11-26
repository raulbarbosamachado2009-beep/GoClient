import { WHATSAPP_WEB_URL } from '@goclient/core';
import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '../theme';
import { Icon, Text } from '../ui/primitives';
import { WA_GREEN } from './brand';
import type { WhatsAppMessage } from './bridge';

/**
 * Versão Web (Preview): o WhatsApp Web não deixa ser aberto dentro de outra página, então
 * mostramos um aviso com link para abri-lo em outra aba (já na conversa, quando o Lucas
 * preparou uma mensagem). No app da multimídia e do celular ele abre aqui dentro.
 */
export function WhatsAppWindow({
  url,
}: {
  url: string | null;
  watchSend: boolean;
  onMessage: (m: WhatsAppMessage) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.notice, { backgroundColor: c.background }]}>
      <Icon name="browsers-outline" size={72} color={c.textTertiary} />
      <Text variant="title2" style={{ textAlign: 'center' }}>
        O WhatsApp abre aqui no app instalado
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 760 }}>
        Esta página de visualização não permite abrir o WhatsApp Web dentro dela. No GoClient da
        multimídia e do celular, ele aparece nesta área, com as conversas da equipe.
      </Text>
      {createElement(
        'a',
        {
          href: url ?? WHATSAPP_WEB_URL,
          target: '_blank',
          rel: 'noreferrer',
          style: {
            marginTop: 16,
            padding: '20px 40px',
            borderRadius: 999,
            background: WA_GREEN,
            color: '#FFFFFF',
            fontFamily: 'SFProDisplay-Semibold',
            fontSize: 26,
            textDecoration: 'none',
          },
        },
        url ? 'Abrir a conversa em outra aba' : 'Abrir o WhatsApp Web em outra aba',
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 48 },
});
