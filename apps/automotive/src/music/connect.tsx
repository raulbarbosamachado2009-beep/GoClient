import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { FONT, layout, spacing, useColors } from '../theme';
import { Appear } from '../ui/motion';
import { Icon, type IconName, Text, Touchable } from '../ui/primitives';

/**
 * Apresentação / login do Spotify (referência: imagem 2).
 *
 * Na integração real, o login acontece na página de autorização do próprio Spotify, que
 * já oferece Google, Apple, Facebook e e-mail; no app final os cinco botões devem virar
 * um único "Entrar com o Spotify".
 */
export function SpotifyConnect({ onConnect }: { onConnect: () => void }) {
  const c = useColors();
  const green = c.music.accent;
  return (
    <View style={{ flex: 1 }}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { left: -layout.sidebarWidth, backgroundColor: '#000000' },
        ]}
      />
      <LinearGradient
        colors={['rgba(30,215,96,0.28)', 'rgba(30,215,96,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.35, y: 0.65 }}
        style={[StyleSheet.absoluteFill, { left: -layout.sidebarWidth }]}
      />
      <LinearGradient
        colors={['rgba(30,215,96,0)', 'rgba(30,215,96,0.18)']}
        start={{ x: 0.4, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { left: -layout.sidebarWidth }]}
      />
      <View style={styles.page}>
        <View style={styles.buttons}>
          {[
            {
              label: 'Entrar com o Spotify',
              primary: true,
              icon: <FontAwesome5 name="spotify" size={46} color="#000" />,
            },
            { label: 'Entrar com o Google', icon: <Brand name="logo-google" /> },
            { label: 'Entrar com a Apple', icon: <Brand name="logo-apple" /> },
            { label: 'Entrar com o Facebook', icon: <Brand name="logo-facebook" /> },
          ].map((b, i) => (
            <Appear key={b.label} delay={80 + i * 70} axis="x" distance={-24}>
              <LoginButton label={b.label} icon={b.icon} primary={b.primary} onPress={onConnect} />
            </Appear>
          ))}
          <Appear delay={380} style={styles.or}>
            <View style={styles.line} />
            <Text variant="callout" color="rgba(255,255,255,0.6)">
              ou
            </Text>
            <View style={styles.line} />
          </Appear>
          <Appear delay={440} axis="x" distance={-24}>
            <LoginButton
              label="Entrar com e-mail"
              icon={<Brand name="mail-outline" />}
              onPress={onConnect}
            />
          </Appear>
        </View>

        <Appear delay={200} style={styles.copy}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[5] }}>
            <FontAwesome5 name="spotify" size={150} color={green} />
            <Text
              variant="largeTitle"
              color={green}
              style={{ fontSize: 120, lineHeight: 130, letterSpacing: -3 }}
            >
              Spotify
            </Text>
          </View>
          <Text variant="largeTitle" color="#FFFFFF" style={styles.headline}>
            Milhões de músicas,{'\n'}
            <Text variant="largeTitle" color={green} style={styles.headline}>
              para você.
            </Text>
          </Text>
          <Text
            variant="body"
            color="rgba(255,255,255,0.7)"
            style={{ fontSize: 28, lineHeight: 38 }}
          >
            Faça login para acessar suas playlists,{'\n'}recomendações e muito mais.
          </Text>
        </Appear>
      </View>
    </View>
  );
}

function Brand({ name }: { name: IconName }) {
  return <Icon name={name} size={42} color="#FFFFFF" />;
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
          ? { backgroundColor: '#1ED760', borderColor: '#1ED760' }
          : { backgroundColor: '#141414', borderColor: '#3A3A3A' },
      ]}
    >
      <View style={styles.loginIcon}>{icon}</View>
      <Text
        variant="title2"
        color={primary ? '#000000' : '#FFFFFF'}
        style={{ flex: 1, fontFamily: FONT.displaySemibold }}
      >
        {label}
      </Text>
      <Icon name="chevron-forward" size={34} color={primary ? '#000000' : '#FFFFFF'} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 64, gap: 72 },
  buttons: { width: 640, gap: spacing[5] },
  loginBtn: {
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing[8],
    paddingRight: spacing[8],
    gap: spacing[8],
  },
  loginIcon: { width: 52, alignItems: 'center' },
  or: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    paddingHorizontal: spacing[4],
  },
  line: { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  copy: { flex: 1, gap: spacing[8] },
  headline: { fontSize: 66, lineHeight: 74, letterSpacing: -1 },
});
