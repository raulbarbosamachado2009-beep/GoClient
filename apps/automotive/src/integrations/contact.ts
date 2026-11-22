import { buildWhatsAppLink, normalizeBrazilianPhone } from '@goclient/core';
import { Linking } from 'react-native';

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
