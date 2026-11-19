import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { FONT, layout, spacing } from '../theme';
import { Appear } from '../ui/motion';
import { Icon, Text, Touchable } from '../ui/primitives';

const ACCENT = '#0A84FF';

/**
 * Apresentação do Kyte (mesmo modelo da tela de entrada do Spotify). Por enquanto só e-mail
 * e senha: o login do Google não funciona dentro de janelas embutidas em apps.
 * O botão abre a página oficial de login do Kyte; a senha é digitada lá, nunca aqui.
 */
export function KyteConnect({ onOpen }: { onOpen: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={[StyleSheet.absoluteFill, { left: -layout.sidebarWidth, backgroundColor: '#000' }]}
      />
      <LinearGradient
        colors={['rgba(10,132,255,0.26)', 'rgba(10,132,255,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.35, y: 0.65 }}
        style={[StyleSheet.absoluteFill, { left: -layout.sidebarWidth }]}
      />
      <View style={styles.page}>
        <View style={styles.buttons}>
          <Appear delay={80} axis="x" distance={-24}>
            <Touchable
              accessibilityRole="button"
              onPress={onOpen}
              style={[styles.loginBtn, { backgroundColor: ACCENT, borderColor: ACCENT }]}
            >
              <View style={styles.loginIcon}>
                <Icon name="mail" size={42} color="#FFFFFF" />
              </View>
              <Text
                variant="title2"
                color="#FFFFFF"
                style={{ flex: 1, fontFamily: FONT.displaySemibold }}
              >
                Entrar com e-mail e senha
              </Text>
              <Icon name="chevron-forward" size={34} color="#FFFFFF" />
            </Touchable>
          </Appear>
          <Appear delay={200}>
            <View style={styles.note}>
              <Icon name="lock-closed" size={26} color="rgba(255,255,255,0.6)" />
              <Text variant="callout" color="rgba(255,255,255,0.6)" style={{ flex: 1 }}>
                Você digita o e-mail e a senha na página oficial do Kyte. O GoClient não vê nem
                guarda a sua senha.
              </Text>
            </View>
          </Appear>
        </View>

        <Appear delay={200} style={styles.copy}>
          <Text
            variant="largeTitle"
            color="#FFFFFF"
            style={{ fontSize: 120, lineHeight: 130, letterSpacing: -3 }}
          >
            Kyte
          </Text>
          <Text variant="largeTitle" color="#FFFFFF" style={styles.headline}>
            Seu PDV,{'\n'}
            <Text variant="largeTitle" color={ACCENT} style={styles.headline}>
              dentro do GoClient.
            </Text>
          </Text>
          <Text
            variant="body"
            color="rgba(255,255,255,0.7)"
            style={{ fontSize: 28, lineHeight: 38 }}
          >
            Entre na sua conta para ver clientes,{'\n'}produtos, estoque e vendas.
          </Text>
        </Appear>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 64, gap: 72 },
  buttons: { width: 640, gap: spacing[6] },
  loginBtn: {
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[8],
  },
  loginIcon: { width: 52, alignItems: 'center' },
  note: { flexDirection: 'row', gap: spacing[4], paddingHorizontal: spacing[4] },
  copy: { flex: 1, gap: spacing[8] },
  headline: { fontSize: 66, lineHeight: 74, letterSpacing: -1 },
});
