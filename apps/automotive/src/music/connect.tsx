import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import { Icon, type IconName, Text, Touchable } from '../ui/primitives';

/**
 * Apresentação / login do Spotify (referência: imagem 2).
 *
 * Observação para a fase de integração: o login real acontece na página de autorização do
 * próprio Spotify, que já oferece Google, Apple, Facebook e e-mail. No app final, os cinco
 * botões provavelmente viram um único "Entrar com o Spotify".
 */
export function SpotifyConnect({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['rgba(30,215,96,0.20)', 'rgba(30,215,96,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.4, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(30,215,96,0)', 'rgba(30,215,96,0.14)']}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.page}>
        <View style={styles.buttons}>
          <LoginButton
            primary
            onPress={onConnect}
            icon={<FontAwesome5 name="spotify" size={40} color={colors.music.onAccent} />}
            label="Entrar com o Spotify"
          />
          <LoginButton
            onPress={onConnect}
            icon={<Brand name="logo-google" />}
            label="Entrar com o Google"
          />
          <LoginButton
            onPress={onConnect}
            icon={<Brand name="logo-apple" />}
            label="Entrar com a Apple"
          />
          <LoginButton
            onPress={onConnect}
            icon={<Brand name="logo-facebook" />}
            label="Entrar com o Facebook"
          />
          <View style={styles.or}>
            <View style={styles.line} />
            <Text variant="callout" tone="secondary">
              ou
            </Text>
            <View style={styles.line} />
          </View>
          <LoginButton
            onPress={onConnect}
            icon={<Brand name="mail-outline" />}
            label="Entrar com e-mail"
          />
        </View>

        <View style={styles.copy}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[5] }}>
            <FontAwesome5 name="spotify" size={120} color={colors.music.accent} />
            <Text
              variant="display"
              color={colors.music.accent}
              style={{ fontSize: 96, lineHeight: 104, letterSpacing: -2 }}
            >
              Spotify
            </Text>
          </View>
          <Text variant="display" style={{ fontSize: 60, lineHeight: 68 }}>
            Milhões de músicas,{'\n'}
            <Text
              variant="display"
              color={colors.music.accent}
              style={{ fontSize: 60, lineHeight: 68 }}
            >
              para você.
            </Text>
          </Text>
          <Text variant="body" tone="secondary" style={{ fontSize: 26, lineHeight: 36 }}>
            Faça login para acessar suas playlists,{'\n'}recomendações e muito mais.
          </Text>
        </View>
      </View>
    </View>
  );
}

function Brand({ name }: { name: IconName }) {
  return <Icon name={name} size={38} color={colors.text} />;
}

function LoginButton({
  label,
  icon,
  primary,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Touchable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.loginBtn,
        primary
          ? { backgroundColor: colors.music.accent, borderColor: colors.music.accent }
          : { backgroundColor: '#1A1A1C', borderColor: '#333336' },
      ]}
    >
      <View style={styles.loginIcon}>{icon}</View>
      <Text
        variant="headline"
        color={primary ? colors.music.onAccent : colors.text}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      <Icon
        name="chevron-forward"
        size={30}
        color={primary ? colors.music.onAccent : colors.textSecondary}
      />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 72, gap: 80 },
  buttons: { width: 620, gap: spacing[4] },
  loginBtn: {
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing[6],
    paddingRight: spacing[8],
    gap: spacing[6],
  },
  loginIcon: { width: 48, alignItems: 'center' },
  or: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    paddingHorizontal: spacing[4],
  },
  line: { flex: 1, height: 1, backgroundColor: '#3A3A3C' },
  copy: { flex: 1, gap: spacing[8] },
});
