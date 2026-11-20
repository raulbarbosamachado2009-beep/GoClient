import { type ComponentRef, useEffect, useRef } from 'react';
import {
  Animated,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  PanResponder,
  Platform,
  View,
} from 'react-native';
import { useFrameScale } from '../preview/automotive-frame';
import { useColors } from '../theme';
import { type MapMode, MapWorld, USER, WORLD } from './world';

const MAX_SCALE = 2.6;

/**
 * Mapa navegável (apenas interação de design, sem dados reais):
 * - arrastar com um dedo/mouse em qualquer direção, com inércia ao soltar;
 * - pinça com dois dedos e roda do mouse para aproximar/afastar;
 * - toque duplo aproxima;
 * - o mapa nunca sai da tela (limites com retorno elástico).
 */
export function PannableMap({ mode, focus }: { mode: MapMode; focus?: { x: number; y: number } }) {
  const c = useColors();
  const view = useRef({ w: 1, h: 1 });
  const state = useRef({ tx: 0, ty: 0, s: 1 });
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;
  const gesture = useRef({
    startTx: 0,
    startTy: 0,
    startS: 1,
    pinchDist: 0,
    pinchMid: { x: 0, y: 0 },
    pinching: false,
  });
  const lastTap = useRef(0);
  const container = useRef<ComponentRef<typeof View>>(null);

  // Com transformações do RN (escala em torno do centro do mundo), um ponto p do mundo
  // aparece na tela em: centro + s·(p − centro) + t.
  const cx = WORLD.width / 2;
  const cy = WORLD.height / 2;

  const minScale = () => Math.max(view.current.w / WORLD.width, view.current.h / WORLD.height);

  const clamp = (t: { tx: number; ty: number; s: number }) => {
    const s = Math.min(MAX_SCALE, Math.max(minScale(), t.s));
    const { w, h } = view.current;
    const minTx = w - cx - s * (WORLD.width - cx);
    const maxTx = cx * (s - 1);
    const minTy = h - cy - s * (WORLD.height - cy);
    const maxTy = cy * (s - 1);
    return {
      s,
      tx: Math.min(maxTx, Math.max(minTx, t.tx)),
      ty: Math.min(maxTy, Math.max(minTy, t.ty)),
    };
  };

  const apply = (t: { tx: number; ty: number; s: number }) => {
    state.current = t;
    tx.setValue(t.tx);
    ty.setValue(t.ty);
    sc.setValue(t.s);
  };

  const animateTo = (t: { tx: number; ty: number; s: number }) => {
    state.current = t;
    const spring = (v: Animated.Value, toValue: number) =>
      Animated.spring(v, { toValue, damping: 26, stiffness: 180, useNativeDriver: false });
    Animated.parallel([spring(tx, t.tx), spring(ty, t.ty), spring(sc, t.s)]).start();
  };

  /** Zoom mantendo fixo o ponto da tela sob o dedo/cursor. */
  const zoomAround = (fx: number, fy: number, nextScale: number, animated = false) => {
    const { tx: x, ty: y, s } = state.current;
    const px = cx + (fx - cx - x) / s;
    const py = cy + (fy - cy - y) / s;
    const s2 = Math.min(MAX_SCALE, Math.max(minScale(), nextScale));
    const next = clamp({ s: s2, tx: fx - cx - s2 * (px - cx), ty: fy - cy - s2 * (py - cy) });
    animated ? animateTo(next) : apply(next);
  };

  /** Centraliza um ponto do mundo na tela. */
  const centerOn = (p: { x: number; y: number }, s: number) => {
    const { w, h } = view.current;
    return clamp({ s, tx: w / 2 - cx - s * (p.x - cx), ty: h / 2 - cy - s * (p.y - cy) });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const first = view.current.w === 1;
    view.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
    if (first) apply(centerOn(focus ?? USER, 1));
  };

  // Ao trocar de modo (ex.: rota calculada), voa suavemente até o ponto de interesse.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reage só à troca de modo/foco
  useEffect(() => {
    if (view.current.w > 1) animateTo(centerOn(focus ?? USER, state.current.s));
  }, [mode, focus?.x, focus?.y]);

  const touchesOf = (e: GestureResponderEvent) => e.nativeEvent.touches;

  // Escala da moldura, lida dentro dos gestos (o PanResponder é criado uma vez só).
  const scaleNow = useFrameScale();
  const frameScale = useRef(scaleNow);
  frameScale.current = scaleNow;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        tx.stopAnimation();
        ty.stopAnimation();
        sc.stopAnimation();
        const g = gesture.current;
        g.startTx = state.current.tx;
        g.startTy = state.current.ty;
        g.startS = state.current.s;
        g.pinching = false;
        const now = Date.now();
        if (now - lastTap.current < 280 && touchesOf(e).length === 1) {
          const { locationX, locationY } = e.nativeEvent;
          zoomAround(locationX, locationY, state.current.s * 1.6, true);
        }
        lastTap.current = now;
      },
      onPanResponderMove: (e, gs) => {
        const touches = touchesOf(e);
        const g = gesture.current;
        if (touches.length >= 2) {
          const [a, b] = touches as [(typeof touches)[0], (typeof touches)[0]];
          const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          const mid = { x: (a.locationX + b.locationX) / 2, y: (a.locationY + b.locationY) / 2 };
          if (!g.pinching) {
            g.pinching = true;
            g.pinchDist = dist;
            g.startS = state.current.s;
            g.pinchMid = mid;
            return;
          }
          zoomAround(g.pinchMid.x, g.pinchMid.y, g.startS * (dist / g.pinchDist));
          return;
        }
        if (g.pinching) return;
        // dx/dy chegam em pixels da tela; a moldura pode estar reduzida (celular, multimídia).
        const k = frameScale.current;
        apply(clamp({ s: state.current.s, tx: g.startTx + gs.dx / k, ty: g.startTy + gs.dy / k }));
      },
      onPanResponderRelease: (_e, gs) => {
        // Inércia: continua deslizando na direção do gesto e desacelera.
        const v = 260;
        animateTo(
          clamp({
            s: state.current.s,
            tx: state.current.tx + (gs.vx * v) / frameScale.current,
            ty: state.current.ty + (gs.vy * v) / frameScale.current,
          }),
        );
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  // Roda do mouse (Preview no navegador) = zoom em torno do cursor.
  // biome-ignore lint/correctness/useExhaustiveDependencies: listener registrado uma vez
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = container.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = node.getBoundingClientRect();
      const ratio = rect.width / view.current.w; // compensa a escala da moldura do Preview
      zoomAround(
        (ev.clientX - rect.left) / ratio,
        (ev.clientY - rect.top) / ratio,
        state.current.s * Math.exp(-ev.deltaY * 0.0016),
      );
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <View
      ref={container}
      onLayout={onLayout}
      style={
        { flex: 1, overflow: 'hidden', backgroundColor: c.map.ground, cursor: 'grab' } as object
      }
      {...responder.panHandlers}
    >
      <Animated.View
        style={{
          width: WORLD.width,
          height: WORLD.height,
          transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
        }}
      >
        <MapWorld c={c} mode={mode} />
      </Animated.View>
    </View>
  );
}
