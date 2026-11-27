import { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

/**
 * Papel de parede das conversas do WhatsApp simulado: as duas imagens enviadas pelo usuário
 * (27/11/2026), a escura no tema escuro e a clara no claro. No celular a imagem cobre a
 * conversa; na multimídia (tela larga) ela se repete, para os desenhos não ficarem enormes.
 */
const DARK = require('../../../assets/whatsapp/wall-dark.jpg');
const LIGHT = require('../../../assets/whatsapp/wall-light.jpg');

/** Cor média de cada imagem (aparece enquanto a imagem carrega). */
export const WALL_DARK = '#0D1E26';
export const WALL_LIGHT = '#EBE7DF';

export const Wallpaper = memo(function Wallpaper({
  dark,
  tile,
}: {
  dark: boolean;
  /** Largura do ladrilho (multimídia). Sem ele, a imagem cobre a área inteira. */
  tile?: number;
}) {
  const source = dark ? DARK : LIGHT;
  // Ladrilhos suficientes para cobrir a área inteira (sem faixa lisa sobrando na borda).
  const [area, setArea] = useState({ w: 0, h: 0 });
  const tileH = tile ? (tile * 16) / 9 : 0;
  const count = tile && area.w ? Math.ceil(area.w / tile) * Math.ceil(area.h / tileH) : 0;
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: dark ? WALL_DARK : WALL_LIGHT, overflow: 'hidden' },
      ]}
    >
      {tile ? (
        <View style={[styles.grid, { width: Math.ceil(area.w / tile) * tile }]}>
          {Array.from({ length: count }, (_, i) => (
            <Image
              // biome-ignore lint/suspicious/noArrayIndexKey: ladrilhos fixos
              key={i}
              source={source}
              style={{ width: tile, height: tileH }}
            />
          ))}
        </View>
      ) : (
        // "Cobrir" com o tamanho calculado (no navegador o `cover` deixava uma faixa lisa).
        area.w > 0 && (
          <Image
            source={source}
            style={{
              position: 'absolute',
              width: Math.ceil(Math.max(area.w, (area.h * 9) / 16)),
              height: Math.ceil(Math.max(area.h, (area.w * 16) / 9)),
              left: Math.min(0, (area.w - Math.max(area.w, (area.h * 9) / 16)) / 2),
              top: 0,
            }}
          />
        )
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
