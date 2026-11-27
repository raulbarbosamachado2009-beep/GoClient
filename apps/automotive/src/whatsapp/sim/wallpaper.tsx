import { memo } from 'react';
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
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: dark ? WALL_DARK : WALL_LIGHT }]}
    >
      {tile ? (
        <View style={[StyleSheet.absoluteFill, styles.grid]}>
          {Array.from({ length: 12 }, (_, i) => (
            <Image
              // biome-ignore lint/suspicious/noArrayIndexKey: ladrilhos fixos
              key={i}
              source={source}
              style={{ width: tile, height: (tile * 16) / 9 }}
            />
          ))}
        </View>
      ) : (
        <Image source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
});
