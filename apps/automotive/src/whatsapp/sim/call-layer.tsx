import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { usePhone, useSystemInsets, useTabBarSpace } from '../../layout/form-factor';
import { FONT, nativeDriver } from '../../theme';
import { appleEase, Presence } from '../../ui/motion';
import { Touchable } from '../../ui/primitives';
import { hangUp, type LiveCall, toggleMute, useCallStatus, useLiveCall } from './call';

/**
 * Painel da ligação de voz (simulada), no visual do WhatsApp Web: cartão escuro com foto,
 * nome e "Chamando…"/duração, e embaixo o microfone e o botão vermelho de desligar.
 * Sem câmera: a ligação de vídeo foi removida do app.
 *
 * - `CallPanel`: dentro do WhatsApp, embaixo da lista de conversas (como no WhatsApp Web).
 * - `CallMini`: nas outras páginas, só foto, nome, duração e desligar, no canto direito.
 *   Arrastar para cima ou para baixo troca o canto (superior ↔ inferior); tocar volta
 *   para o WhatsApp.
 */
const C = {
  card: '#161717',
  top: '#242626',
  ink: '#FFFFFF',
  sub: '#AEBAC1',
  pill: '#2E2F2F',
  red: '#EA0038',
  avatar: '#103B4F',
  avatarInk: '#8ACDEA',
  group: '#0B3A36',
  groupInk: '#6FD1C5',
};

function Avatar({ size, group }: { size: number; group: boolean }) {
  return (
    <View
      style={[
        styles.center,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: group ? C.group : C.avatar,
        },
      ]}
    >
      <Ionicons
        name={group ? 'people' : 'person'}
        size={size * 0.5}
        color={group ? C.groupInk : C.avatarInk}
      />
    </View>
  );
}

/** Telefone "deitado" (desligar), como no WhatsApp. */
function HangUpIcon({ size }: { size: number }) {
  return (
    <View style={{ transform: [{ rotate: '135deg' }] }}>
      <Ionicons name="call" size={size} color="#FFFFFF" />
    </View>
  );
}

/** Anel que pulsa em volta da foto enquanto chama. */
function Ringing({ size, on }: { size: number; on: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 1400,
        easing: appleEase,
        useNativeDriver: nativeDriver,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      v.setValue(0);
    };
  }, [on, v]);
  if (!on) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: '#21C063',
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
      }}
    />
  );
}

function Who({ call, k, avatar }: { call: LiveCall; k: number; avatar: number }) {
  const status = useCallStatus(call);
  return (
    <>
      <View style={[styles.center, { width: avatar, height: avatar }]}>
        <Ringing size={avatar} on={call.status === 'ringing'} />
        <Avatar size={avatar} group={call.group} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: FONT.displayMedium, fontSize: 17 * k, color: C.ink }}
        >
          {call.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: FONT.displayRegular,
            fontSize: 14 * k,
            color: C.sub,
            fontVariant: ['tabular-nums'],
          }}
        >
          {status}
        </Text>
      </View>
    </>
  );
}

/** Painel completo, embaixo da lista do WhatsApp. `k` é a escala do simulado. */
export function CallPanel({ k }: { k: number }) {
  const call = useLiveCall();
  return (
    <Presence show={!!call} distance={24} style={styles.dock}>
      {call && (
        <View
          style={{
            margin: 8 * k,
            padding: 8 * k,
            gap: 8 * k,
            borderRadius: 16 * k,
            backgroundColor: C.card,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14 * k,
              padding: 10 * k,
              borderRadius: 10 * k,
              backgroundColor: C.top,
            }}
          >
            <Who call={call} k={k} avatar={Math.round(44 * k)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * k }}>
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={call.muted ? 'Ativar microfone' : 'Desativar microfone'}
              onPress={toggleMute}
              scaleTo={0.92}
              style={[
                styles.center,
                {
                  width: 60 * k,
                  height: 34 * k,
                  borderRadius: 17 * k,
                  backgroundColor: call.muted ? '#FFFFFF' : C.pill,
                },
              ]}
            >
              <Ionicons
                name={call.muted ? 'mic-off' : 'mic'}
                size={19 * k}
                color={call.muted ? '#111B21' : '#FFFFFF'}
              />
            </Touchable>
            <View style={{ flex: 1 }} />
            <Touchable
              accessibilityRole="button"
              accessibilityLabel="Desligar"
              onPress={hangUp}
              scaleTo={0.92}
              style={[
                styles.center,
                { width: 64 * k, height: 34 * k, borderRadius: 17 * k, backgroundColor: C.red },
              ]}
            >
              <HangUpIcon size={20 * k} />
            </Touchable>
          </View>
        </View>
      )}
    </Presence>
  );
}

/** Cartão mínimo nas outras páginas (canto superior ou inferior direito). */
export function CallMini({ hidden }: { hidden: boolean }) {
  const call = useLiveCall();
  const router = useRouter();
  const phone = usePhone();
  const system = useSystemInsets();
  const tabSpace = useTabBarSpace();
  const [corner, setCorner] = useState<'top' | 'bottom'>('top');
  const drag = useRef(new Animated.Value(0)).current;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderMove: (_, g) => drag.setValue(g.dy),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) > 60) setCorner(g.dy > 0 ? 'bottom' : 'top');
        Animated.spring(drag, { toValue: 0, useNativeDriver: nativeDriver, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(drag, { toValue: 0, useNativeDriver: nativeDriver }).start(),
    }),
  ).current;

  const k = phone ? 1.3 : 1.6;
  const edge = phone ? 16 : 24;
  const place =
    corner === 'top'
      ? { top: (phone ? system.top : 0) + edge }
      : { bottom: (phone ? tabSpace : 0) + edge };

  return (
    <Presence
      show={!!call && !hidden}
      distance={corner === 'top' ? -20 : 20}
      style={[styles.mini, place, { right: edge }]}
    >
      {call && (
        <Animated.View
          {...pan.panHandlers}
          style={[styles.miniCard, { transform: [{ translateY: drag }] }]}
        >
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={`Ligação com ${call.name}. Abrir o WhatsApp`}
            onPress={() => router.push('/whatsapp')}
            scaleTo={0.97}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12 * k,
              paddingVertical: 8 * k,
              paddingLeft: 8 * k,
              paddingRight: 8 * k,
              width: phone ? 300 : 400,
              borderRadius: 999,
              backgroundColor: C.card,
            }}
          >
            <Who call={call} k={k} avatar={Math.round(40 * k)} />
            <Touchable
              accessibilityRole="button"
              accessibilityLabel="Desligar"
              onPress={hangUp}
              scaleTo={0.9}
              style={[
                styles.center,
                {
                  width: 40 * k,
                  height: 40 * k,
                  borderRadius: 20 * k,
                  backgroundColor: C.red,
                },
              ]}
            >
              <HangUpIcon size={20 * k} />
            </Touchable>
          </Touchable>
        </Animated.View>
      )}
    </Presence>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  mini: { position: 'absolute', zIndex: 50 },
  miniCard: {
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
