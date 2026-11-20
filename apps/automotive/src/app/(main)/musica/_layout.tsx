import { LinearGradient } from 'expo-linear-gradient';
import { Slot, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SpotifyConnect } from '../../../music/connect';
import { usePrototype } from '../../../prototype/state';
import { MiniPlayer } from '../../../shell/mini-player';
import { useSpotify } from '../../../spotify/provider';
import { layout, spacing, useColors } from '../../../theme';
import { ScreenTransition } from '../../../ui/motion';

/**
 * Área de Música: primeiro a apresentação/login; depois o conteúdo e o player minimizado
 * (somente aqui). Não há abas no rodapé: a navegação fica na barra lateral do app e dentro
 * das páginas (lupa no Início, "Sua Biblioteca" na grade e botões de voltar).
 */
export default function MusicLayout() {
  const c = useColors();
  const { musicConnected, setMusicConnected } = usePrototype();
  const pathname = usePathname();
  const sp = useSpotify();

  // Enquanto lê as contas salvas, não pisca a tela de login.
  if (sp.enabled && !sp.ready) return null;
  if (!musicConnected)
    return <SpotifyConnect real={sp.enabled} onConnect={() => setMusicConnected(true)} />;

  return (
    <View style={{ flex: 1 }}>
      {/* O fundo continua por baixo da barra lateral, que o desfoca. */}
      <View style={[styles.bleed, { backgroundColor: c.music.background }]}>
        <LinearGradient
          colors={[c.music.ambient, `${c.music.ambient}00`]}
          style={[StyleSheet.absoluteFill, { height: 360 }]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <ScreenTransition routeKey={pathname}>
          <Slot />
        </ScreenTransition>
      </View>

      <View style={{ paddingHorizontal: spacing[3], paddingBottom: spacing[3] }}>
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { position: 'absolute', top: 0, right: 0, bottom: 0, left: -layout.sidebarWidth },
});
