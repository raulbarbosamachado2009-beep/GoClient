import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { KyteConnect } from '../../kyte/connect';
import { KyteWindow, type KyteWindowHandle } from '../../kyte/window';
import { usePrototype } from '../../prototype/state';
import { spacing, useColors } from '../../theme';
import { IconButton, Text } from '../../ui/primitives';

/**
 * Área do Kyte: apresentação até o usuário entrar; depois, o Kyte Web numa janela interna.
 * A barra de cima tem só recarregar e fechar (sair da conta é pelo menu do próprio Kyte).
 */
export default function KyteScreen() {
  const c = useColors();
  const { kyteOpen, setKyteOpen } = usePrototype();
  const win = useRef<KyteWindowHandle>(null);

  if (!kyteOpen) return <KyteConnect onOpen={() => setKyteOpen(true)} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.bar, { borderBottomColor: c.separator }]}>
        <Text variant="headline" style={{ flex: 1 }}>
          Kyte
        </Text>
        <IconButton
          icon="refresh"
          iconSize={34}
          accessibilityLabel="Recarregar o Kyte"
          onPress={() => win.current?.reload()}
        />
        <IconButton
          icon="close"
          iconSize={38}
          accessibilityLabel="Fechar o Kyte"
          onPress={() => setKyteOpen(false)}
        />
      </View>
      <KyteWindow ref={win} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingLeft: spacing[6],
    paddingRight: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
