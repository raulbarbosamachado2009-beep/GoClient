import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SPOTIFY_ACCOUNTS } from '../mocks/data';
import { usePrototype } from '../prototype/state';
import { avatarColors } from '../spotify/mapping';
import { useSpotify } from '../spotify/provider';
import { nativeDriver, spacing, useColors } from '../theme';
import { Avatar, Icon, Text, Touchable } from '../ui/primitives';

interface Anchor {
  x: number;
  y: number;
  height: number;
}

/**
 * Foto do perfil do Spotify no topo da Música. Tocar abre o mini menu para alternar
 * entre as contas que já entraram neste aparelho ou adicionar outra.
 */
export function AccountButton({ size = 84 }: { size?: number }) {
  const { spotifyAccount, setOverlay } = usePrototype();
  const ref = useRef<ComponentRef<typeof View>>(null);

  const open = () => {
    ref.current?.measureInWindow((x, y, _w, height) => {
      setOverlay(<AccountMenu anchor={{ x, y, height }} onClose={() => setOverlay(null)} />);
    });
  };

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`Conta do Spotify: ${spotifyAccount.name}. Alternar conta`}
      onPress={open}
      scaleTo={0.92}
    >
      <View ref={ref} collapsable={false}>
        <Avatar name={spotifyAccount.name} colors={spotifyAccount.colors} size={size} />
      </View>
    </Touchable>
  );
}

/** Mini menu de contas, ancorado logo abaixo da foto do perfil. */
function AccountMenu({ anchor, onClose }: { anchor: Anchor; onClose: () => void }) {
  const c = useColors();
  const { spotifyAccount, setSpotifyAccount } = usePrototype();
  const sp = useSpotify();
  // Com Spotify real: as contas que já entraram neste aparelho; senão, as do protótipo.
  const list = sp.enabled
    ? sp.accounts.map((a) => ({ id: a.id, name: a.name, colors: avatarColors(a.id) }))
    : SPOTIFY_ACCOUNTS;
  const enter = useRef(new Animated.Value(0)).current;
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number; scale: number } | null>(null);
  const closing = useRef(false);

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      damping: 22,
      stiffness: 300,
      useNativeDriver: nativeDriver,
    }).start();
  }, [enter]);

  const close = useCallback(
    (after?: () => void) => {
      if (closing.current) return;
      closing.current = true;
      Animated.timing(enter, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: nativeDriver,
      }).start(() => {
        after?.();
        onClose();
      });
    },
    [enter, onClose],
  );

  return (
    <View
      ref={rootRef}
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        // As medidas da janela já vêm com a escala da moldura do Preview (a tela de
        // 1600×900 é reduzida para caber). Compara com a largura real desta camada para
        // converter a posição da foto para as coordenadas daqui.
        const width = e.nativeEvent.layout.width;
        rootRef.current?.measureInWindow((x, y, w) =>
          setOrigin({ x, y, scale: width > 0 && w > 0 ? w / width : 1 }),
        );
      }}
    >
      <Pressable
        accessibilityLabel="Fechar menu de contas"
        onPress={() => close()}
        style={StyleSheet.absoluteFill}
      />
      {origin && (
        <Animated.View
          style={[
            styles.menu,
            {
              left: (anchor.x - origin.x) / origin.scale,
              top: (anchor.y - origin.y + anchor.height) / origin.scale + 12,
              backgroundColor: c.mode === 'dark' ? '#282828' : '#FFFFFF',
              opacity: enter,
              transformOrigin: 'top left',
              transform: [
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
              ],
            },
          ]}
        >
          {list.map((a) => {
            const current = a.id === spotifyAccount.id;
            return (
              <Touchable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={`Usar a conta ${a.name}`}
                accessibilityState={{ selected: current }}
                onPress={() => close(() => setSpotifyAccount(a.id))}
                scaleTo={0.97}
                style={styles.row}
              >
                <Avatar name={a.name} colors={a.colors} size={56} />
                <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {a.name}
                </Text>
                {current && <Icon name="checkmark" size={30} color={c.music.accent} />}
              </Touchable>
            );
          })}
          <View style={[styles.divider, { backgroundColor: c.separator }]} />
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Adicionar outra conta"
            onPress={() => close(sp.enabled ? sp.openLogin : undefined)}
            scaleTo={0.97}
            style={styles.row}
          >
            <View style={[styles.add, { borderColor: c.textTertiary }]}>
              <Icon name="add" size={32} color={c.text} />
            </View>
            <Text variant="bodyStrong">Adicionar conta</Text>
          </Touchable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    width: 400,
    borderRadius: 20,
    paddingVertical: spacing[2],
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  row: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[5],
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing[5], marginVertical: 4 },
  add: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
