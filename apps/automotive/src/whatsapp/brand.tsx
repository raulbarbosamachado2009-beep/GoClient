import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

/** Verde do WhatsApp, usado só no ícone e no botão principal da aba. */
export const WA_GREEN = '#25D366';

/**
 * Ícone do WhatsApp no menu: o símbolo do WhatsApp (Ionicons, MIT) em branco sobre o verde,
 * no formato dos ícones de app (mesmo raio do ícone do Kyte).
 */
export function WhatsAppLogo({ size = 64 }: { size?: number }) {
  return (
    <View
      accessibilityLabel="WhatsApp"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        backgroundColor: WA_GREEN,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="logo-whatsapp" size={size * 0.62} color="#FFFFFF" />
    </View>
  );
}
