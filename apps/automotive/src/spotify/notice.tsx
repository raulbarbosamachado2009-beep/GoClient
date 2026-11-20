import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { Appear } from '../ui/motion';
import { Icon, IconButton, Text } from '../ui/primitives';
import { useSpotify } from './provider';

/** Aviso do Spotify no topo da tela (some sozinho depois de alguns segundos). */
export function SpotifyNotice() {
  const { notice, clearNotice } = useSpotify();
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 9000);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);
  if (!notice) return null;
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Appear key={notice} distance={-20}>
        <View style={styles.card}>
          <Icon name="musical-notes" size={36} color="#1ED760" />
          <Text variant="headline" color="#FFFFFF" style={{ flex: 1 }}>
            {notice}
          </Text>
          <IconButton
            icon="close"
            iconSize={36}
            color="#FFFFFF"
            accessibilityLabel="Fechar aviso"
            onPress={clearNotice}
          />
        </View>
      </Appear>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 24, left: 180, right: 40, alignItems: 'center', zIndex: 90 },
  card: {
    maxWidth: 1100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[5],
    paddingVertical: spacing[4],
    paddingLeft: spacing[6],
    paddingRight: spacing[3],
    borderRadius: 28,
    backgroundColor: '#282828',
    elevation: 12,
  },
});
