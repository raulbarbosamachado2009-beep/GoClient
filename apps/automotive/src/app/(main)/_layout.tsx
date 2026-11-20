import { Slot, usePathname } from 'expo-router';
import { type ComponentRef, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { TAB_BAR_HEIGHT, usePhone } from '../../layout/form-factor';
import { SpotifyBar } from '../../music/phone';
import { usePrototype } from '../../prototype/state';
import { Sidebar } from '../../shell/sidebar';
import { TabBar } from '../../shell/tab-bar';
import { layout, useColors } from '../../theme';
import { BlurArea, BlurTargetProvider } from '../../ui/blur-target';
import { ScreenTransition } from '../../ui/motion';

/**
 * Estrutura das telas principais. Multimídia (ou celular deitado): barra lateral do CarPlay
 * + conteúdo. Celular em pé: conteúdo + barra de abas embaixo. As rotas são as mesmas, então
 * girar o celular mantém a tela aberta.
 */
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
  const phone = usePhone();
  // O Mapa passa por baixo da barra (lateral ou de abas), que é translúcida.
  const underBar = section === 'mapa';
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <BlurArea targetRef={screen} style={StyleSheet.absoluteFill}>
        {/* No Mapa o conteúdo passa por baixo da barra lateral (que é translúcida). */}
        <BlurArea
          targetRef={content}
          style={{
            flex: 1,
            marginLeft: phone || underBar ? 0 : layout.sidebarWidth,
            marginBottom: phone && !underBar ? TAB_BAR_HEIGHT : 0,
          }}
        >
          {/* Dentro das telas não há área definida: cada tela define a sua (ex.: o Mapa). */}
          <BlurTargetProvider value={null}>
            <ScreenTransition routeKey={section} fade={section !== 'mapa'}>
              <Slot />
            </ScreenTransition>
          </BlurTargetProvider>
        </BlurArea>
        <BlurTargetProvider value={content}>
          {/* Na Música do celular, a barra de baixo vira a do Spotify (com volta ao app). */}
          {phone ? section === 'musica' ? <SpotifyBar /> : <TabBar /> : <Sidebar />}
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
