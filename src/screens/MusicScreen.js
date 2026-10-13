// src/screens/MusicScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { AutomotiveCard } from '../components/AutomotiveCard';
import { mockMusicLibrary } from '../mock/mockData';

const FILTER_PILLS = ['Todos', 'Álbuns', 'Artistas', 'Playlists', 'Recentes'];

export const MusicScreen = () => {
  const [activeFilter, setActiveFilter] = useState('Álbuns');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrack, setCurrentTrack] = useState(mockMusicLibrary.currentTrack);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolume] = useState(75);

  const handleSelectAlbum = (album) => {
    setCurrentTrack({
      id: album.id,
      title: album.title,
      artist: album.artist,
      album: album.title,
      duration: '3:45',
      progress: 0,
      coverColor: album.color,
      isLiked: false,
    });
    setIsPlaying(true);
  };

  return (
    <View style={styles.container}>
      {/* Corpo Principal Widescreen: Biblioteca Lateral + Grid de Músicas */}
      <View style={styles.mainSplit}>
        {/* Painel Esquerdo: Biblioteca e Playlists (Inspirado no Spotify Desktop/Landscape) */}
        <View style={styles.librarySidebar}>
          <View style={styles.libraryHeader}>
            <View style={styles.libraryHeaderLeft}>
              <Ionicons name="library" size={24} color={colors.textPrimary} />
              <Text style={styles.libraryTitle}>Sua Biblioteca</Text>
            </View>
            <TouchableOpacity style={styles.addBtn}>
              <Ionicons name="add" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.playlistsScroll}>
            {mockMusicLibrary.playlists.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={styles.playlistItem}
                activeOpacity={0.7}
              >
                <View style={[styles.playlistIconBox, { backgroundColor: `${playlist.color}25` }]}>
                  <Ionicons name={playlist.icon} size={22} color={playlist.color} />
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{playlist.title}</Text>
                  <Text style={styles.playlistCount}>{playlist.count} músicas</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Área Central: Busca, Filtros e Grid de Mídias */}
        <View style={styles.catalogArea}>
          {/* Barra Superior de Busca e Filtros */}
          <View style={styles.topFilterBar}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar artistas, músicas ou álbuns..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Pílulas de Filtros */}
            <View style={styles.pillsRow}>
              {FILTER_PILLS.map((pill) => {
                const isActive = activeFilter === pill;
                return (
                  <TouchableOpacity
                    key={pill}
                    onPress={() => setActiveFilter(pill)}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {pill}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Grid de Álbuns / Músicas (Referência Visual Mac DeMarco Spotify) */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.albumsGrid}
          >
            {mockMusicLibrary.albums.map((album) => {
              const isCurrent = currentTrack.title === album.title;
              return (
                <TouchableOpacity
                  key={album.id}
                  style={[styles.albumCard, isCurrent && styles.albumCardActive]}
                  onPress={() => handleSelectAlbum(album)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.albumArtwork, { backgroundColor: album.color }]}>
                    <Ionicons name="disc" size={54} color="rgba(255,255,255,0.7)" />
                    <View style={styles.cardPlayOverlay}>
                      <Ionicons
                        name={isCurrent && isPlaying ? 'pause' : 'play'}
                        size={26}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {album.title}
                  </Text>
                  <Text style={styles.albumMeta} numberOfLines={1}>
                    {album.year} • {album.artist}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Barra Inferior Persistente de Reprodução Veicular (Persistent Player Bar) */}
      <View style={styles.persistentPlayerBar}>
        {/* Info da Música Atual à Esquerda */}
        <View style={styles.playerLeftTrack}>
          <View style={[styles.playerThumb, { backgroundColor: currentTrack.coverColor }]}>
            <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.playerTrackMeta}>
            <Text style={styles.playerTrackTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.playerTrackArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.playerHeartBtn}
            onPress={() => setCurrentTrack({ ...currentTrack, isLiked: !currentTrack.isLiked })}
          >
            <Ionicons
              name={currentTrack.isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={currentTrack.isLiked ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Controles Centrais de Reprodução e Barra de Progresso */}
        <View style={styles.playerCenterControls}>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={() => setIsShuffle(!isShuffle)}
              style={styles.auxControlBtn}
            >
              <Ionicons
                name="shuffle"
                size={22}
                color={isShuffle ? colors.accentGreen : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navControlBtn}>
              <Ionicons name="play-skip-back" size={26} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mainPlayBtn}
              onPress={() => setIsPlaying(!isPlaying)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={30}
                color={colors.textOnPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navControlBtn}>
              <Ionicons name="play-skip-forward" size={26} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsRepeat(!isRepeat)}
              style={styles.auxControlBtn}
            >
              <Ionicons
                name="repeat"
                size={22}
                color={isRepeat ? colors.accentGreen : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Barra de Progresso */}
          <View style={styles.progressRow}>
            <Text style={styles.timeLabel}>1:14</Text>
            <View style={styles.progressBarWrapper}>
              <View style={[styles.progressBarFill, { width: '40%' }]} />
            </View>
            <Text style={styles.timeLabel}>{currentTrack.duration}</Text>
          </View>
        </View>

        {/* Controles de Volume e Saída de Som à Direita */}
        <View style={styles.playerRightAudio}>
          <Ionicons name="bluetooth" size={18} color={colors.accentBlue} />
          <Text style={styles.audioOutputText}>Som Automotivo</Text>

          <View style={styles.volumeGroup}>
            <TouchableOpacity
              onPress={() => setVolume(Math.max(0, volume - 10))}
              style={styles.volumeStepBtn}
            >
              <Ionicons name="volume-low" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.volumeBar}>
              <View style={[styles.volumeBarFill, { width: `${volume}%` }]} />
            </View>

            <TouchableOpacity
              onPress={() => setVolume(Math.min(100, volume + 10))}
              style={styles.volumeStepBtn}
            >
              <Ionicons name="volume-high" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainSplit: {
    flex: 1,
    flexDirection: 'row',
  },
  librarySidebar: {
    width: 320,
    backgroundColor: colors.backgroundElevated,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceBorder,
    padding: layout.spacing.lg,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: layout.spacing.md,
  },
  libraryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  libraryTitle: {
    ...typography.title3,
    color: colors.textPrimary,
  },
  addBtn: {
    padding: 6,
  },
  playlistsScroll: {
    flex: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  playlistIconBox: {
    width: 48,
    height: 48,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  playlistCount: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  catalogArea: {
    flex: 1,
    padding: layout.spacing.xl,
  },
  topFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.spacing.lg,
    marginBottom: layout.spacing.lg,
  },
  searchBox: {
    flex: 0.5,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: layout.radius.pill,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: layout.radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  filterPillText: {
    ...typography.buttonMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  filterPillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.spacing.lg,
    paddingBottom: 20,
  },
  albumCard: {
    width: 175,
    backgroundColor: colors.surface,
    borderRadius: layout.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  albumCardActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  albumArtwork: {
    width: '100%',
    height: 150,
    borderRadius: layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  cardPlayOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  albumTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  albumMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  persistentPlayerBar: {
    height: layout.playerBarHeight,
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.spacing.xl,
  },
  playerLeftTrack: {
    flex: 0.28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  playerThumb: {
    width: 56,
    height: 56,
    borderRadius: layout.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerTrackMeta: {
    flex: 1,
  },
  playerTrackTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  playerTrackArtist: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  playerHeartBtn: {
    padding: 6,
  },
  playerCenterControls: {
    flex: 0.44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 6,
  },
  auxControlBtn: {
    padding: 6,
  },
  navControlBtn: {
    padding: 6,
  },
  mainPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    width: 32,
    textAlign: 'center',
  },
  progressBarWrapper: {
    flex: 1,
    height: 5,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  playerRightAudio: {
    flex: 0.28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  audioOutputText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  volumeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeStepBtn: {
    padding: 4,
  },
  volumeBar: {
    width: 90,
    height: 5,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    backgroundColor: colors.textPrimary,
  },
});
