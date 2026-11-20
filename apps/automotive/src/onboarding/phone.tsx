import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HavenaOrb } from '../havena/orb';
import { spacing } from '../theme';
import { LogoMark } from '../ui/brand';
import { Appear } from '../ui/motion';
import { Icon, type IconName, Text, Touchable } from '../ui/primitives';

/**
 * Onboarding do celular em pé (referência: boas-vindas do app Apple TV). Folha escura com
 * cantos arredondados sobre o fundo, botão "Continuar" em pílula e "Agora não" em texto.
 */

const SHEET = '#1C1C1E';
const BLUE = '#0A84FF';

function Sheet({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#3A3F44', '#141516']} style={StyleSheet.absoluteFill} />
      <Appear distance={40} fade={false} style={styles.sheet}>
        {top}
        <View style={styles.body}>{children}</View>
      </Appear>
    </View>
  );
}

function PillButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Touchable accessibilityRole="button" onPress={onPress} scaleTo={0.97} style={styles.pill}>
      <Text variant="title2" color="#FFFFFF" style={{ fontSize: 34 }}>
        {label}
      </Text>
    </Touchable>
  );
}

// ─── Boas-vindas ────────────────────────────────────────────────────────────────────────

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'storefront',
    title: 'Sua carteira no bolso',
    text: 'Clientes, pedidos e produtos do Kyte, sempre à mão.',
  },
  {
    icon: 'navigate',
    title: 'Rotas que se organizam',
    text: 'Escolha quem visitar hoje e o GoClient monta o trajeto.',
  },
  {
    icon: 'mic',
    title: 'Havena ao seu lado',
    text: 'Pergunte e organize por voz, sem tirar as mãos do volante.',
  },
  {
    icon: 'musical-notes',
    title: 'Sua música junto',
    text: 'Spotify integrado, no carro e no celular.',
  },
];

export function PhoneWelcome({ onContinue }: { onContinue: () => void }) {
  return (
    <Sheet>
      <View style={{ flex: 1, paddingTop: 96, gap: 56 }}>
        <Appear delay={80} distance={16}>
          <Text variant="largeTitle" color="#FFFFFF" style={styles.title}>
            Bem-vindo ao GoClient
          </Text>
        </Appear>
        <View style={{ gap: 48 }}>
          {FEATURES.map((f, i) => (
            <Appear key={f.title} delay={180 + i * 90} distance={14} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={56} color={BLUE} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="title2" color="#FFFFFF" style={{ fontSize: 32, lineHeight: 38 }}>
                  {f.title}
                </Text>
                <Text variant="body" color="rgba(235,235,245,0.6)" style={styles.text}>
                  {f.text}
                </Text>
              </View>
            </Appear>
          ))}
        </View>
      </View>

      <Appear delay={600} distance={12} style={{ gap: spacing[5] }}>
        <Icon name="people" size={60} color={BLUE} />
        <Text
          variant="footnote"
          color="rgba(235,235,245,0.6)"
          style={{ fontSize: 22, lineHeight: 28 }}
        >
          Seus clientes, rotas e pedidos de voz são usados para montar as visitas, sugerir rotas e
          responder pela Havena. A senha do Kyte e do Spotify fica só na página de cada um.{' '}
          <Text variant="footnote" color={BLUE} style={{ fontSize: 22, lineHeight: 28 }}>
            Veja como seus dados são usados…
          </Text>
        </Text>
        <PillButton label="Continuar" onPress={onContinue} />
      </Appear>
    </Sheet>
  );
}

// ─── Permissão ──────────────────────────────────────────────────────────────────────────

export function PhonePermission({
  art,
  title,
  text,
  onAllow,
  onSkip,
}: {
  art: 'location' | 'microphone';
  title: string;
  text: string;
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <Sheet top={<Illustration art={art} />}>
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 72, gap: spacing[4] }}>
        <Appear delay={120} distance={14}>
          <Text
            variant="largeTitle"
            color="#FFFFFF"
            style={[styles.title, { textAlign: 'center' }]}
          >
            {title}
          </Text>
        </Appear>
        <Appear delay={200} distance={14}>
          <Text variant="body" color="rgba(235,235,245,0.6)" style={[styles.text, styles.center]}>
            {text}
          </Text>
        </Appear>
      </View>
      <Appear delay={320} distance={12} style={{ gap: spacing[6], alignItems: 'stretch' }}>
        <PillButton label="Continuar" onPress={onAllow} />
        <Touchable accessibilityRole="button" onPress={onSkip} style={styles.notNow}>
          <Text variant="title2" color={BLUE} style={{ fontSize: 32 }}>
            Agora não
          </Text>
        </Touchable>
      </Appear>
    </Sheet>
  );
}

/** Ilustração: a tela de bloqueio de um celular com um aviso do GoClient. */
function Illustration({ art }: { art: 'location' | 'microphone' }) {
  return (
    <View style={styles.art}>
      <LinearGradient
        colors={['#000000', '#1C1C1E']}
        locations={[0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Appear delay={150} distance={30} style={styles.phone}>
        <LinearGradient colors={['#111113', '#3A3A3C']} style={StyleSheet.absoluteFill} />
        <View style={styles.notification}>
          <View style={styles.appIcon}>
            {art === 'location' ? <LogoMark size={76} /> : <HavenaOrb size={76} />}
          </View>
          <View style={{ flex: 1, gap: 12 }}>
            <View style={[styles.line, { width: '42%', height: 20 }]} />
            <View style={styles.line} />
            <View style={[styles.line, { width: '80%' }]} />
          </View>
        </View>
        <View style={styles.lockButtons}>
          <View style={styles.lockButton}>
            <Icon name={art === 'location' ? 'location' : 'mic'} size={34} color="#8E8E93" />
          </View>
          <View style={styles.lockButton}>
            <Icon name="camera" size={34} color="#8E8E93" />
          </View>
        </View>
        <View style={styles.homeBar} />
      </Appear>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  sheet: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    backgroundColor: SHEET,
    overflow: 'hidden',
  },
  body: { flex: 1, paddingHorizontal: 64, paddingBottom: 64 },
  title: { fontSize: 50, lineHeight: 58, letterSpacing: -0.5 },
  text: { fontSize: 30, lineHeight: 38 },
  center: { textAlign: 'center', maxWidth: 560 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[6] },
  featureIcon: { width: 72, alignItems: 'center', paddingTop: 4 },
  pill: {
    height: 100,
    borderRadius: 50,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNow: { height: 72, alignItems: 'center', justifyContent: 'center' },
  art: { height: 640, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  phone: {
    width: 480,
    height: 500,
    marginBottom: 56,
    borderRadius: 72,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: 18,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    padding: 22,
    borderRadius: 44,
    backgroundColor: 'rgba(120,120,128,0.36)',
    marginBottom: 72,
  },
  appIcon: { width: 76, height: 76, borderRadius: 18, overflow: 'hidden' },
  line: { height: 12, borderRadius: 6, backgroundColor: 'rgba(235,235,245,0.32)', width: '100%' },
  lockButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 32 },
  lockButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(120,120,128,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBar: {
    alignSelf: 'center',
    width: 180,
    height: 8,
    borderRadius: 4,
    marginTop: 32,
    backgroundColor: 'rgba(235,235,245,0.3)',
  },
});
