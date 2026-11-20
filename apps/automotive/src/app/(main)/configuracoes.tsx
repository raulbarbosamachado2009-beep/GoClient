import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { GOOGLE_MAPS_ENABLED } from '../../integrations/env';
import { usePhone } from '../../layout/form-factor';
import { useSpotify } from '../../spotify/provider';
import { spacing, type ThemePreference, useColors, useTheme } from '../../theme';
import { useEdgeFade } from '../../ui/edge-fade';
import { Appear } from '../../ui/motion';
import {
  AppIcon,
  Avatar,
  Group,
  PageHeader,
  Row,
  SectionHeader,
  Segmented,
  Switch,
} from '../../ui/primitives';

/**
 * Ajustes no estilo do iOS: perfil, aparência (claro/escuro funcionando no protótipo),
 * idioma, Havena, navegação, integrações, dados e sair.
 */
export default function SettingsScreen() {
  const c = useColors();
  const { preference, setPreference } = useTheme();
  const router = useRouter();
  const [wakeWord, setWakeWord] = useState(true);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [offline, setOffline] = useState(true);
  const sp = useSpotify();
  const phone = usePhone();
  const spotifyValue = !sp.enabled
    ? 'Demonstração (sem Client ID)'
    : sp.active
      ? sp.active.name
      : 'Não conectado';

  const sections = [
    <Group key="perfil" inset={148}>
      <Row
        leading={<Avatar name="Raul Barbosa" size={96} />}
        title="Raul Barbosa"
        subtitle="Perfil, conta e plano Pro"
        chevron
        onPress={() => {}}
      />
    </Group>,

    <View key="aparencia">
      <SectionHeader title="Aparência" />
      <Group inset={128}>
        <Row
          leading={<AppIcon icon="contrast" color="#0A84FF" size={68} />}
          title="Tema"
          trailing={
            <Segmented<ThemePreference>
              value={preference}
              onChange={setPreference}
              segmentWidth={phone ? 128 : 180}
              options={[
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Escuro' },
                { value: 'auto', label: 'Automático' },
              ]}
            />
          }
        />
        <Row
          leading={<AppIcon icon="language" color="#5856D6" size={68} />}
          title="Idioma"
          value="Português (Brasil)"
          chevron
          onPress={() => {}}
        />
      </Group>
    </View>,

    <View key="havena">
      <SectionHeader title="Havena" />
      <Group inset={128}>
        <Row
          leading={<AppIcon icon="mic" color="#FF375F" size={68} />}
          title='Ativar com "Oi, Havena"'
          trailing={<Switch value={wakeWord} onChange={setWakeWord} />}
        />
        <Row
          leading={<AppIcon icon="volume-high" color="#FF9F0A" size={68} />}
          title="Respostas por voz"
          trailing={<Switch value={voiceReplies} onChange={setVoiceReplies} />}
        />
      </Group>
    </View>,

    <View key="integracoes">
      <SectionHeader title="Navegação e integrações" />
      <Group inset={128}>
        <Row
          leading={<AppIcon icon="map" color="#30D158" size={68} />}
          title="Mapa"
          value={GOOGLE_MAPS_ENABLED ? 'Google Maps' : 'Demonstração (sem chave)'}
        />
        <Row
          leading={<AppIcon icon="navigate" color="#30D158" size={68} />}
          title="Navegação com voz"
          value="Google Maps"
        />
        <Row
          leading={<AppIcon icon="musical-notes" color="#1ED760" glyph="#000" size={68} />}
          title="Spotify"
          value={spotifyValue}
          chevron={sp.enabled}
          onPress={() =>
            sp.enabled ? (sp.active ? router.replace('/musica') : sp.openLogin()) : undefined
          }
        />
        {sp.enabled && sp.active && (
          <Row
            title={`Desconectar ${sp.active.name} do Spotify`}
            titleColor={c.danger}
            onPress={() => sp.active && sp.removeAccount(sp.active.id)}
          />
        )}
        <Row
          leading={<AppIcon icon="storefront" color="#AC8E68" size={68} />}
          title="Kyte"
          value="Importar planilhas"
          chevron
          onPress={() => {}}
        />
      </Group>
    </View>,

    <View key="dados">
      <SectionHeader title="Dados e privacidade" />
      <Group inset={128}>
        <Row
          leading={<AppIcon icon="cloud-offline" color="#64D2FF" glyph="#003A55" size={68} />}
          title="Modo offline"
          trailing={<Switch value={offline} onChange={setOffline} />}
        />
        <Row
          leading={<AppIcon icon="hand-left" color="#0A84FF" size={68} />}
          title="Permissões"
          chevron
          onPress={() => {}}
        />
        <Row
          leading={<AppIcon icon="information-circle" color="#8E8E93" size={68} />}
          title="Sobre"
          value="Versão 0.1.0"
          chevron
          onPress={() => {}}
        />
      </Group>
    </View>,

    <Group key="sair">
      <Row
        title="Sair da conta"
        titleColor={c.danger}
        onPress={() => router.replace('/onboarding')}
      />
    </Group>,
  ];

  const fade = useEdgeFade();
  return (
    <View style={styles.page}>
      <PageHeader title="Ajustes" subtitle="Conta, preferências e integrações" />
      <View style={{ flex: 1 }}>
        <ScrollView
          {...fade.scrollProps}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {sections.map((s, i) => (
            <Appear key={s.key} delay={i * 50} distance={12}>
              {s}
            </Appear>
          ))}
        </ScrollView>
        {fade.edges}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 48, paddingTop: 36, gap: spacing[5] },
  content: { gap: spacing[8], paddingBottom: spacing[12] },
});
