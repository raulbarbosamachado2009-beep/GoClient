import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { usePrototype } from '../../prototype/state';
import { MiniPlayer } from '../../shell/mini-player';
import { Sidebar } from '../../shell/sidebar';
import { colors, layout } from '../../theme';

/** Estrutura das telas principais: menu lateral + conteúdo + player minimizado. */
export default function MainLayout() {
  const { overlay, nowPlaying } = usePrototype();
  return (
    <View style={styles.root}>
      <Sidebar />
      <View style={styles.content}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        {nowPlaying && (
          <View style={styles.player}>
            <MiniPlayer />
          </View>
        )}
      </View>
      {overlay && <View style={StyleSheet.absoluteFill}>{overlay}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  content: { flex: 1 },
  player: { paddingHorizontal: layout.gutter, paddingBottom: layout.gutter, paddingTop: 8 },
});
