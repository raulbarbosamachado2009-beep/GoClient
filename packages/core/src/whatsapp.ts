/**
 * Integração com WhatsApp por links (wa.me) — não usa API do WhatsApp, apenas abre o
 * aplicativo com a conversa e, opcionalmente, uma mensagem preenchida.
 */
export function normalizeBrazilianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return null;
  // Já com DDI 55 (12 ou 13 dígitos).
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
  // DDD + número (10 dígitos fixo, 11 celular).
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return null;
}

export function buildWhatsAppLink(phone: string, message?: string): string | null {
  const normalized = normalizeBrazilianPhone(phone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Endereço do WhatsApp Web (o mesmo do site oficial). */
export const WHATSAPP_WEB_URL = 'https://web.whatsapp.com/';

/**
 * Conversa aberta no WhatsApp Web com a mensagem já escrita na caixa de texto
 * (`/send?phone=…&text=…`, link do próprio WhatsApp). Não envia: a pessoa toca em enviar.
 */
export function buildWhatsAppWebSend(phone: string, message?: string): string | null {
  const normalized = normalizeBrazilianPhone(phone);
  if (!normalized) return null;
  const text = message ? `&text=${encodeURIComponent(message)}` : '';
  return `${WHATSAPP_WEB_URL}send?phone=${normalized}${text}`;
}
