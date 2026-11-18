import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import {
  Avatar,
  Button,
  Card,
  Divider,
  Icon,
  type IconName,
  PageHeader,
  Segmented,
  Switch,
  Tag,
  Text,
  Touchable,
} from '../../ui/primitives';

type Theme = 'dark' | 'light' | 'auto';

/**
 * Configurações: perfil, aparência, idioma, Havena, navegação, integrações, dados e
 * sair. Interruptores e seletores mudam apenas o estado visual nesta fase.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('dark');
  const [wakeWord, setWakeWord] = useState(true);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [offline, setOffline] = useState(true);

  return (
    <View style={styles.page}>
      <PageHeader title="Configurações" subtitle="Conta, preferências e integrações" />
      <View style={styles.columns}>
        <View style={styles.profileCol}>
          <Card style={styles.profile}>
            <Avatar name="Raul Barbosa" size={140} />
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text variant="title">Raul Barbosa</Text>
              <Text variant="callout" tone="secondary">
                raul@goclient.app
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <Tag label="Representante" icon="person-outline" />
              <Tag label="Plano Pro" icon="sparkles-outline" color={colors.accent} />
            </View>
            <Button
              label="Editar perfil"
              variant="secondary"
              size="md"
              style={{ alignSelf: 'stretch' }}
            />
          </Card>
          <Button
            label="Sair da conta"
            icon="log-out-outline"
            variant="danger"
            onPress={() => router.replace('/onboarding')}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: spacing[6], paddingBottom: spacing[10] }}
          showsVerticalScrollIndicator={false}
        >
          <Group title="APARÊNCIA">
            <Row
              icon="contrast-outline"
              title="Tema"
              subtitle="O modo escuro reduz o brilho à noite"
            >
              <Segmented<Theme>
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'dark', label: 'Escuro', icon: 'moon-outline' },
                  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
                  { value: 'auto', label: 'Automático' },
                ]}
              />
            </Row>
            <Row icon="language-outline" title="Idioma" chevron>
              <Text variant="body" tone="secondary">
                Português (Brasil)
              </Text>
            </Row>
          </Group>

          <Group title="HAVENA">
            <Row
              icon="mic-outline"
              title='Ativar com "Oi, Havena"'
              subtitle="Escuta a palavra de ativação com o app aberto"
            >
              <Switch value={wakeWord} onChange={setWakeWord} />
            </Row>
            <Row icon="volume-high-outline" title="Respostas por voz">
              <Switch value={voiceReplies} onChange={setVoiceReplies} />
            </Row>
          </Group>

          <Group title="NAVEGAÇÃO">
            <Row icon="car-outline" title="App de navegação" chevron>
              <Text variant="body" tone="secondary">
                GoClient Mapa
              </Text>
            </Row>
          </Group>

          <Group title="INTEGRAÇÕES">
            <Row icon="musical-notes-outline" title="Spotify" chevron>
              <Text variant="body" tone="secondary">
                Não conectado
              </Text>
            </Row>
            <Row icon="storefront-outline" title="Kyte" chevron>
              <Text variant="body" tone="secondary">
                Importar planilhas
              </Text>
            </Row>
          </Group>

          <Group title="DADOS E PRIVACIDADE">
            <Row
              icon="cloud-offline-outline"
              title="Modo offline"
              subtitle="Mantém clientes e produtos no aparelho"
            >
              <Switch value={offline} onChange={setOffline} />
            </Row>
            <Row icon="shield-checkmark-outline" title="Permissões" chevron />
            <Row icon="information-circle-outline" title="Sobre o GoClient" chevron>
              <Text variant="body" tone="secondary">
                Versão 0.1.0
              </Text>
            </Row>
          </Group>
        </ScrollView>
      </View>
    </View>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="label" tone="tertiary" style={{ paddingLeft: spacing[2] }}>
        {title}
      </Text>
      <Card style={{ paddingHorizontal: spacing[6] }}>
        {items.map((child, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lista estática
          <View key={i}>
            {i > 0 && <Divider inset={76} />}
            {child}
          </View>
        ))}
      </Card>
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  chevron,
  children,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  chevron?: boolean;
  children?: ReactNode;
}) {
  return (
    <Touchable disabled={!chevron} style={styles.row} pressedOpacity={0.8}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={30} color={colors.text} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle && (
          <Text variant="caption" tone="secondary">
            {subtitle}
          </Text>
        )}
      </View>
      {children}
      {chevron && <Icon name="chevron-forward" size={28} color={colors.textTertiary} />}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 48, paddingTop: 40, gap: spacing[6] },
  columns: { flex: 1, flexDirection: 'row', gap: spacing[8] },
  profileCol: { width: 440, gap: spacing[4] },
  profile: { alignItems: 'center', padding: spacing[8], gap: spacing[5] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    minHeight: 104,
    paddingVertical: spacing[3],
  },
  rowIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.panelHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
