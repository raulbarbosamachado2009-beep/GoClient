import { View } from 'react-native';
import { composeWhatsApp } from '../../integrations/contact';
import { SendToSheet, type ShareTarget } from '../../whatsapp/share-sheet';
import { CHATS, CONTACTS, type SimMessage } from '../../whatsapp/sim/data';
import { deliver, simNow } from '../../whatsapp/sim/outbox';
import { type ReceiptData, receiptPlainText } from '../print/escpos';
import { cachedCustomers, PREVIEW } from '../store';

/**
 * "Compartilhar" do recibo: abre o "Enviar para" do WhatsApp.
 * - Preview: contatos do WhatsApp simulado (fictícios); o recibo chega nas conversas
 *   escolhidas como documento, com a mensagem opcional embaixo.
 * - App: clientes do Kyte com telefone; abre a conversa no WhatsApp com o recibo escrito e
 *   a pessoa toca em enviar (nada sai sozinho).
 */
export function ReceiptShare({
  data: r,
  onClose,
  onSent,
  onFail,
  router,
}: {
  data: ReceiptData;
  onClose: () => void;
  onSent: (text: string) => void;
  onFail: (e: unknown) => void;
  router: { replace: (href: '/whatsapp') => void };
}) {
  const thumb = <ReceiptThumb />;

  if (PREVIEW) {
    const byId = new Map(CONTACTS.map((c) => [c.id, c]));
    const target = (id: string): ShareTarget | null => {
      const c = byId.get(id);
      if (!c) return null;
      return {
        id: c.id,
        name: c.name,
        group: !!c.members,
        sub: c.members ? c.members.join(', ') : c.about,
      };
    };
    const frequent = CONTACTS.filter((c) => c.favorite)
      .map((c) => target(c.id))
      .filter((t): t is ShareTarget => !!t);
    const seen = new Set(frequent.map((t) => t.id));
    const recent = CHATS.map((ch) => ch.contact)
      .filter((id) => !seen.has(id))
      .map(target)
      .filter((t): t is ShareTarget => !!t);
    return (
      <SendToSheet
        frequent={frequent}
        recent={recent}
        thumb={thumb}
        onClose={onClose}
        onSend={(ids, caption) => {
          const stamp = Date.now();
          deliver(
            ids.map((id) => {
              const messages: SimMessage[] = [
                {
                  id: `r${stamp}${id}`,
                  out: true,
                  kind: 'doc',
                  text: `Recibo #${r.number}`,
                  meta: 'PDF · 1 página',
                  time: simNow(),
                  day: 'Hoje',
                },
              ];
              if (caption)
                messages.push({
                  id: `r${stamp}${id}t`,
                  out: true,
                  text: caption,
                  time: simNow(),
                  day: 'Hoje',
                });
              return { chatId: id, messages };
            }),
          );
          const names = ids.map((id) => byId.get(id)?.name.split(' ')[0]).filter(Boolean);
          onSent(
            names.length === 1
              ? `Recibo enviado para ${names[0]}.`
              : `Recibo enviado para ${names.length} conversas.`,
          );
        }}
      />
    );
  }

  // App: clientes do Kyte com telefone (o do recibo primeiro).
  const customers = (cachedCustomers() ?? []).filter((c) => c.phone.trim());
  const own = r.customer?.phone ? r.customer : null;
  const frequent: ShareTarget[] = own ? [{ id: 'recibo', name: own.name, sub: own.phone }] : [];
  const recent: ShareTarget[] = customers
    .filter((c) => !own || c.phone !== own.phone)
    .slice(0, 40)
    .map((c) => ({ id: c.id, name: c.name, sub: c.phone }));
  return (
    <SendToSheet
      single
      frequent={frequent}
      recent={recent}
      thumb={thumb}
      onClose={onClose}
      onSend={(ids, caption) => {
        const id = ids[0];
        const who =
          id === 'recibo' && own
            ? { name: own.name, phone: own.phone }
            : customers.find((c) => c.id === id);
        if (!who) return;
        const text = [caption, receiptPlainText(r)].filter(Boolean).join('\n\n');
        if (composeWhatsApp({ to: who.name, phone: who.phone, text }, router) === 'invalid')
          onFail(new Error(`O telefone de ${who.name} não parece válido.`));
      }}
    />
  );
}

/** Miniatura do recibo (papel com linhas), na barra de envio. */
function ReceiptThumb() {
  const line = (w: `${number}%`, bold?: boolean) => (
    <View
      style={{
        width: w,
        height: bold ? 5 : 3,
        borderRadius: 2,
        backgroundColor: bold ? '#2E3A59' : '#C9CED6',
      }}
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10, gap: 5 }}>
      <View style={{ alignItems: 'flex-end' }}>{line('60%', true)}</View>
      {line('45%')}
      <View style={{ height: 2, backgroundColor: '#2E3A59', marginVertical: 2 }} />
      {line('90%')}
      {line('75%')}
      {line('85%')}
      <View style={{ alignItems: 'flex-end' }}>{line('50%', true)}</View>
    </View>
  );
}
