import { Slot, usePathname } from 'expo-router';
import { type ComponentRef, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { warmVoice } from '../../havena/voice';
import { WakeListener } from '../../havena/wake';
import { KyteAgentHost } from '../../kyte/agent';
import { restoreKyteCache } from '../../kyte/store';
import { usePhone, useSystemInsets, useTabBarSpace } from '../../layout/form-factor';
import { StopsProvider } from '../../map/stops';
import { usePrototype } from '../../prototype/state';
import { isKept, KeptScreens } from '../../shell/kept-screens';
import { Sidebar } from '../../shell/sidebar';
import { TabBar } from '../../shell/tab-bar';
import { layout, useColors } from '../../theme';
import { BlurArea, BlurTargetProvider } from '../../ui/blur-target';
import { ScreenTransition, usePageTransition } from '../../ui/motion';
import { CallMini, CallScreen } from '../../whatsapp/sim/call-layer';

/**
 * Estrutura das telas principais. Multimídia (ou celular deitado): barra lateral do CarPlay
 * + conteúdo. Celular em pé: conteúdo + barra de abas embaixo. As rotas são as mesmas, então
 * girar o celular mantém a tela aberta.
 */
export default function MainLayout() {
  const c = useColors();
  const { overlay } = usePrototype();
  const pathname = usePathname();
  // A transição acontece por seção (subpáginas trocam o conteúdo sem refazê-la).
  const section = pathname.split('/')[1] ?? '';
  // Áreas de desfoque no Android (ver ui/blur-target.tsx): a barra lateral desfoca o
  // conteúdo; janelas e o Lucas desfocam o conteúdo + a barra lateral.
  const content = useRef<ComponentRef<typeof View>>(null);
  const screen = useRef<ComponentRef<typeof View>>(null);
  const phone = usePhone();
  const system = useSystemInsets();
  const tabSpace = useTabBarSpace();
  // Margens de cada seção. O Mapa passa por baixo da barra (lateral ou de abas), que é
  // translúcida. No celular, o Kyte também vai até o rodapé, por trás da barra de abas
  // flutuante. O WhatsApp simulado do celular (Preview) também é tela cheia: passa por trás
  // da barra de abas e vai até a borda de cima, afastando só o próprio conteúdo.
  const frame = (s: string): ViewStyle => {
    const underBar = s === 'mapa';
    const waFull = phone && s === 'whatsapp' && Platform.OS === 'web';
    const fullHeight = underBar || s === 'kyte' || waFull;
    return {
      marginLeft: phone || underBar ? 0 : layout.sidebarWidth,
      marginBottom: phone && !fullHeight ? tabSpace : 0,
      // Celular: o fundo vai até a borda de cima; o conteúdo desce da câmera/entalhe.
      // (O Mapa vai inteiro até a borda e afasta só os próprios controles.)
      paddingTop: phone && !underBar && s !== 'kyte' && !waFull ? system.top : 0,
    };
  };
  // Liga o motor de voz logo ao abrir o app: a primeira resposta do Lucas já sai na hora.
  useEffect(warmVoice, []);
  // Dados do Kyte já lidos antes (arquivo do aparelho): as telas do Kyte abrem com eles na hora.
  useEffect(() => {
    void restoreKyteCache();
  }, []);
  const page = usePageTransition();
  return (
    <StopsProvider>
      {/* Ao chegar do login, o painel entra em foco (mesma transição das páginas). */}
      <Animated.View style={[styles.root, { backgroundColor: c.background }, page.style]}>
        {/* Janela invisível do Kyte, usada pelo Lucas e pelo Início (só no app Android). */}
        <KyteAgentHost />
        {/* Ativação por voz ("olá Lucas", "bom dia", "oh IA"…), com o Lucas fechado. */}
        <WakeListener />
        <BlurArea targetRef={screen} style={StyleSheet.absoluteFill}>
          {/* Área do conteúdo: ocupa a tela toda; cada camada (a rota atual e as telas
              mantidas) põe a própria margem, conforme a seção dela. */}
          <BlurArea targetRef={content} style={{ flex: 1 }}>
            {/* Dentro das telas não há área definida: cada tela define a sua (ex.: o Mapa). */}
            <BlurTargetProvider value={null}>
              <View
                style={[
                  StyleSheet.absoluteFill,
                  frame(section),
                  { zIndex: isKept(section) ? 0 : 2 },
                ]}
                pointerEvents="box-none"
              >
                <ScreenTransition routeKey={section}>
                  <Slot />
                </ScreenTransition>
              </View>
              {/* Mapa, Kyte e WhatsApp ficam abertos por trás: trocar de aba é instantâneo. */}
              <KeptScreens section={section} frame={frame} />
            </BlurTargetProvider>
          </BlurArea>
          <BlurTargetProvider value={content}>
            {phone ? <TabBar /> : <Sidebar />}
          </BlurTargetProvider>
        </BlurArea>
        {/* Ligação do WhatsApp em andamento: fora do WhatsApp vira um cartão mínimo. */}
        <CallMini onWhatsApp={section === 'whatsapp'} />
        {/* Celular: a ligação abre em tela cheia, por cima da barra de abas. */}
        {phone && <CallScreen />}
        {overlay && (
          <BlurTargetProvider value={screen}>
            <View style={StyleSheet.absoluteFill}>{overlay}</View>
          </BlurTargetProvider>
        )}
      </Animated.View>
    </StopsProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
