import { Slot, usePathname } from 'expo-router';
import { type ComponentRef, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrototype } from '../../prototype/state';
import { Sidebar } from '../../shell/sidebar';
import { layout, useColors } from '../../theme';
import { BlurArea, BlurTargetProvider } from '../../ui/blur-target';
import { ScreenTransition } from '../../ui/motion';

/** Estrutura das telas principais: barra lateral do CarPlay + conteúdo com transição. */
export default function MainLayout() {
  const c = useColors();
  const { overlay } = usePrototype();
  const pathname = usePathname();
  // Dentro da Música, as abas trocam o conteúdo sem refazer a transição da seção inteira.
  const section = pathname.split('/')[1] ?? '';
  // Áreas de desfoque no Android (ver ui/blur-target.tsx): a barra lateral desfoca o
  // conteúdo; janelas e a Havena desfocam o conteúdo + a barra lateral.
  const content = useRef<ComponentRef<typeof View>>(null);
  const screen = useRef<ComponentRef<typeof View>>(null);
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <BlurArea targetRef={screen} style={StyleSheet.absoluteFill}>
        {/* No Mapa o conteúdo passa por baixo da barra lateral (que é translúcida). */}
        <BlurArea
          targetRef={content}
          style={{ flex: 1, marginLeft: section === 'mapa' ? 0 : layout.sidebarWidth }}
        >
          {/* Dentro das telas não há área definida: cada tela define a sua (ex.: o Mapa). */}
          <BlurTargetProvider value={null}>
            <ScreenTransition routeKey={section} fade={section !== 'mapa'}>
              <Slot />
            </ScreenTransition>
          </BlurTargetProvider>
        </BlurArea>
        <BlurTargetProvider value={content}>
          <Sidebar />
        </BlurTargetProvider>
      </BlurArea>
      {overlay && (
        <BlurTargetProvider value={screen}>
          <View style={StyleSheet.absoluteFill}>{overlay}</View>
        </BlurTargetProvider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
