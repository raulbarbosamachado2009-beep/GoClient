import { Slot, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { usePrototype } from '../../prototype/state';
import { Sidebar } from '../../shell/sidebar';
import { useColors } from '../../theme';
import { ScreenTransition } from '../../ui/motion';

/** Estrutura das telas principais: barra lateral do CarPlay + conteúdo com transição. */
export default function MainLayout() {
  const c = useColors();
  const { overlay } = usePrototype();
  const pathname = usePathname();
  // Dentro da Música, as abas trocam o conteúdo sem refazer a transição da seção inteira.
  const section = pathname.split('/')[1] ?? '';
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Sidebar />
      <View style={{ flex: 1 }}>
        <ScreenTransition routeKey={section}>
          <Slot />
        </ScreenTransition>
      </View>
      {overlay && <View style={StyleSheet.absoluteFill}>{overlay}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
});
