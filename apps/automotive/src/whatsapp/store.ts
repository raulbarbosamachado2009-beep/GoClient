import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Estado do WhatsApp no GoClient: se o WhatsApp Web já está vinculado neste aparelho
 * (lembrado entre usos) e a conversa que o Lucas pediu para abrir, com a mensagem pronta.
 * O envio é sempre um toque da pessoa no botão de enviar do próprio WhatsApp.
 */
const LINKED_KEY = 'goclient.whatsapp.linked';
let linked = false;

if (Platform.OS !== 'web')
  SecureStore.getItemAsync(LINKED_KEY)
    .then((v) => {
      linked = linked || v === '1';
    })
    .catch(() => {});

export const whatsappLinked = () => linked;

export function noteWhatsAppLinked(v: boolean) {
  if (v === linked) return;
  linked = v;
  if (Platform.OS !== 'web') SecureStore.setItemAsync(LINKED_KEY, v ? '1' : '0').catch(() => {});
}

/** Conversa que deve abrir na aba WhatsApp, com o texto já escrito. */
export interface Draft {
  /** Para quem (como aparece na tela: "Adão"). */
  to: string;
  phone: string;
  text: string;
  /** Endereço da conversa no WhatsApp Web (`/send?phone=…&text=…`). */
  url: string;
  /** Quando a pessoa tocar em enviar (visto na página), o Lucas diz "Enviado!". */
  onSent?: () => void;
}

let draft: Draft | null = null;
const listeners = new Set<(d: Draft | null) => void>();

export function setDraft(d: Draft | null) {
  draft = d;
  for (const l of listeners) l(d);
}

export const currentDraft = () => draft;

export function subscribeDraft(l: (d: Draft | null) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
