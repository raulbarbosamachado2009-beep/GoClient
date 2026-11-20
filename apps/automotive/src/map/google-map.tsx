import { type ComponentRef, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { layout } from '../theme';
import { Text } from '../ui/primitives';
import type { LatLng } from './google';

export interface MapPin {
  id: string;
  coordinate: LatLng;
  label?: string;
  /** Parada da rota (azul) ou cliente solto (cinza). */
  kind: 'stop' | 'client';
}

/**
 * Mapa real do Google (Android). Desenha a posição do carro, os clientes e a rota, e
 * enquadra a câmera deixando livre a área do cartão à direita e da barra lateral.
 */
export function GoogleMap({
  dark,
  user,
  path,
  pins,
}: {
  dark: boolean;
  user: LatLng | null;
  path: LatLng[];
  pins: MapPin[];
}) {
  const ref = useRef<ComponentRef<typeof MapView>>(null);
  const centered = useRef(false);

  // Com rota: enquadra o caminho inteiro. Sem rota: centra no carro uma vez.
  const pathKey =
    path.length > 0 ? `${path.length}:${path[0]?.latitude}:${path[path.length - 1]?.latitude}` : '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: reage à troca de rota
  useEffect(() => {
    if (path.length > 1) {
      ref.current?.fitToCoordinates(path, { edgePadding: PADDING, animated: true });
    }
  }, [pathKey]);
  useEffect(() => {
    if (!user || centered.current || path.length > 1) return;
    centered.current = true;
    ref.current?.animateCamera({ center: user, zoom: 15 }, { duration: 600 });
  }, [user, path.length]);

  return (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      customMapStyle={dark ? NIGHT : []}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      showsTraffic={path.length > 1}
      toolbarEnabled={false}
      mapPadding={{ top: 0, right: 520, bottom: 0, left: layout.sidebarWidth }}
      initialRegion={{
        latitude: user?.latitude ?? -22.9056,
        longitude: user?.longitude ?? -47.0608,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }}
    >
      {path.length > 1 && (
        <>
          <Polyline coordinates={path} strokeColor="#0A3D91" strokeWidth={16} />
          <Polyline coordinates={path} strokeColor="#0A84FF" strokeWidth={10} />
        </>
      )}
      {pins.map((p, i) => (
        <Marker
          key={p.id}
          coordinate={p.coordinate}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View
            style={[
              styles.pin,
              { backgroundColor: p.kind === 'stop' ? '#0A84FF' : dark ? '#3A3A3C' : '#8E8E93' },
            ]}
          >
            <Text variant="headline" color="#FFFFFF">
              {p.label ?? String(i + 1)}
            </Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const PADDING = { top: 120, right: 120, bottom: 160, left: 120 };

const styles = StyleSheet.create({
  pin: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});

/** Estilo noturno (padrão "Night" da documentação do Google). */
const NIGHT = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];
