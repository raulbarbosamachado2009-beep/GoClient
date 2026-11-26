import { buildWhatsAppLink, buildWhatsAppWebSend, normalizeBrazilianPhone } from '@goclient/core';
import { Linking } from 'react-native';
import { setDraft } from '../whatsapp/store';

/**
 * Contato com o cliente. WhatsApp por link (wa.me): abre a conversa com a mensagem pronta; o
 * envio é sempre um toque da pessoa (o WhatsApp não deixa outro app enviar sozinho).
 */
export function openWhatsApp(phone: string, message?: string): boolean {
  const url = buildWhatsAppLink(phone, message);
  if (!url) return false;
  Linking.openURL(url).catch(() => {});
  return true;
}

/** Abre o discador com o número do cliente. */
export function callPhone(phone: string): boolean {
  const n = normalizeBrazilianPhone(phone);
  if (!n) return false;
  Linking.openURL(`tel:+${n}`).catch(() => {});
  return true;
}

/**
 * Abre a conversa com a mensagem já escrita **no WhatsApp Web do próprio GoClient** (aba
 * WhatsApp). A multimídia não tem o app do WhatsApp nem chip: ela é um aparelho conectado ao
 * número da equipe. Se o WhatsApp ainda não estiver vinculado, a aba mostra o QR code e a
 * conversa abre logo depois. O envio é sempre o toque da pessoa; `onSent` é chamado quando
 * a mensagem aparece como enviada na conversa.
 */
export function composeWhatsApp(
  msg: { to: string; phone: string; text: string },
  router: { replace: (href: '/whatsapp') => void },
  onSent?: () => void,
): 'in-app' | 'invalid' {
  const url = buildWhatsAppWebSend(msg.phone, msg.text);
  if (!url) return 'invalid';
  setDraft({ ...msg, url, onSent });
  router.replace('/whatsapp');
  return 'in-app';
}
