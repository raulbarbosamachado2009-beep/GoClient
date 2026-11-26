import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, usePathname, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { HavenaOrb } from '../havena/orb';
import { HavenaPanel } from '../havena/panel';
import { usePrototype } from '../prototype/state';
import { concentric, layout, spacing, useColors } from '../theme';
import { KyteLogo } from '../ui/brand';
import { useSpring } from '../ui/motion';
import { Blur, Text, Touchable } from '../ui/primitives';
import { WhatsAppLogo } from '../whatsapp/brand';
import { type AppGlyph, MapAppIcon, OutlineGlyph } from './app-icons';

interface Item {
  href: Href;
  match: string;
  label: string;
  glyph: AppGlyph;
}

const MAP_LIGHT = require('../../assets/map/map-light.jpg');
const MAP_DARK = require('../../assets/map/map-dark.jpg');

const ITEMS: Item[] = [
  { href: '/mapa', match: '/mapa', label: 'Mapa', glyph: 'mapa' },
  { href: '/kyte', match: '/kyte', label: 'Kyte', glyph: 'kyte' },
  { href: '/whatsapp', match: '/whatsapp', label: 'WhatsApp', glyph: 'whatsapp' },
];

/**
 * Painel flutuante (referência: barra lateral do painel do carro): um bloco arredondado
 * afastado das bordas, com a hora em cima, os apps como ícones de app empilhados e os
 * Ajustes no pé. Bordas concêntricas: raio do painel − espaçamento = raio dos ícones.
 */
const INSET = 16;
const PANEL_W = layout.sidebarWidth - INSET * 2;
const PANEL_R = 52;
const PANEL_PAD = 22;
const ICON = PANEL_W - PANEL_PAD * 2;
const ICON_R = concentric(PANEL_R, PANEL_PAD);
const GAP = 18;
const SLOT = ICON + GAP;

export function Sidebar() {
  const c = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { setOverlay, kyteOpen } = usePrototype();
  const activeIndex = ITEMS.findIndex((i) => pathname.startsWith(i.match));
  const settingsActive = pathname.startsWith('/configuracoes');
  const y = useSpring(Math.max(activeIndex, 0) * SLOT);
  const openHavena = () => setOverlay(<HavenaPanel onClose={() => setOverlay(null)} />);

  // O painel acompanha a página aberta: claro no Kyte (fundo cinza-claro), escuro no resto.
  // (Só depois de conectado: a tela de conexão do Kyte é escura.)
  const onKyte = pathname.startsWith('/kyte') && kyteOpen;
  const dark = c.mode === 'dark' && !onKyte;
  const ink = dark ? '#F2F2F7' : '#1C1C1E';
  // Fundo do painel: a cor da página aberta, translúcida, sobre uma imagem desfocada do que
  // a página mostra (o mapa no Mapa). O painel parece vidro fosco na cor de cada página.
  const onMap = pathname.startsWith('/mapa');
  const pageBg = onKyte ? '#EEF1F5' : c.background;
  const backdrop = onMap ? (dark ? MAP_DARK : MAP_LIGHT) : null;
  const veil = onKyte
    ? 'rgba(255,255,255,0.72)'
    : backdrop
      ? dark
        ? 'rgba(18,18,20,0.5)'
        : 'rgba(255,255,255,0.5)'
      : dark
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(0,0,0,0.04)';

  return (
    <View style={[styles.bar, { backgroundColor: pageBg }]}>
      <View
        style={[styles.panel, { borderColor: onKyte ? 'rgba(0,0,0,0.06)' : c.material.border }]}
      >
        {backdrop && (
          <Image
            source={backdrop}
            blurRadius={40}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.4 }] }]}
          />
        )}
        <Blur radius={40} tint={c.material.tint} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: veil }]} />

        <View style={styles.status}>
          <Clock color={ink} />
          <View style={styles.signal}>
            <Ionicons name="cellular" size={22} color={ink} />
            <Ionicons name="battery-full" size={26} color={ink} />
          </View>
        </View>

        <View style={{ height: (ITEMS.length + 1) * SLOT }}>
          {activeIndex >= 0 && (
            <Animated.View
              style={[
                styles.indicator,
                { backgroundColor: c.accent, transform: [{ translateY: y }] },
              ]}
            />
          )}
          {ITEMS.map((item, i) => (
            <Tile
              key={item.label}
              top={i * SLOT}
              label={item.label}
              selected={i === activeIndex}
              onPress={() => router.replace(item.href)}
            >
              {item.glyph === 'kyte' ? (
                <KyteLogo size={ICON} />
              ) : item.glyph === 'whatsapp' ? (
                <WhatsAppLogo size={ICON} />
              ) : (
                <View style={[styles.icon, { overflow: 'hidden' }]}>
                  <MapAppIcon size={ICON} dark={dark} />
                </View>
              )}
            </Tile>
          ))}
          <Tile top={ITEMS.length * SLOT} label="Falar com o Lucas" onPress={openHavena}>
            <HavenaOrb size={ICON - 8} ambient />
          </Tile>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ height: ICON }}>
          {settingsActive && <View style={[styles.indicator, { backgroundColor: c.accent }]} />}
          <Tile
            top={0}
            label="Ajustes"
            selected={settingsActive}
            onPress={() => router.replace('/configuracoes')}
          >
            <View style={[styles.icon, { backgroundColor: dark ? '#3A3A3C' : '#8E8E93' }]}>
              <OutlineGlyph glyph="ajustes" size={60} color="#FFFFFF" />
            </View>
          </Tile>
        </View>
      </View>
    </View>
  );
}

function Tile({
  top,
  label,
  selected,
  onPress,
  children,
}: {
  top: number;
  label: string;
  selected?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      scaleTo={0.9}
      style={[styles.tile, { top }]}
    >
      {children}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: layout.sidebarWidth },
  panel: {
    position: 'absolute',
    left: INSET,
    top: INSET,
    bottom: INSET,
    width: PANEL_W,
    borderRadius: PANEL_R,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingTop: spacing[5],
    paddingBottom: PANEL_PAD,
  },
  status: { alignItems: 'center', gap: 4, marginBottom: spacing[5] },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tile: {
    position: 'absolute',
    left: PANEL_PAD,
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON_R,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Marca do app aberto: traço curto na borda esquerda do painel, que desliza por mola.
  indicator: {
    position: 'absolute',
    left: 0,
    top: ICON / 2 - 22,
    width: 6,
    height: 44,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
});

/** Hora de verdade (atualiza a cada minuto). */
function Clock({ color }: { color: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const wait = 60_000 - (Date.now() % 60_000);
    let every: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      tick();
      every = setInterval(tick, 60_000);
    }, wait);
    return () => {
      clearTimeout(first);
      if (every) clearInterval(every);
    };
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <Text variant="title2" color={color} style={{ fontSize: 30, lineHeight: 34 }}>
      {hh}:{mm}
    </Text>
  );
}
