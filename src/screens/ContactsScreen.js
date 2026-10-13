// src/screens/ContactsScreen.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { typography } from '../theme/typography';
import { AutomotiveButton } from '../components/AutomotiveButton';
import { AutomotiveHeader } from '../components/AutomotiveHeader';
import { mockClients } from '../mock/mockData';

export const ContactsScreen = ({ onNavigateToRoute }) => {
  const [selectedClient, setSelectedClient] = useState(mockClients[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const filteredClients = mockClients.filter((client) => {
    const matchesQuery =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = onlyFavorites ? client.isFavorite : true;
    return matchesQuery && matchesFav;
  });

  return (
    <View style={styles.container}>
      <AutomotiveHeader
        title="Clientes & Contatos"
        subtitle="Agenda Profissional Sincronizada • Chamadas Viva-Voz"
      />

      {/* Split-View Horizontal Widescreen 16:9 */}
      <View style={styles.splitLayout}>
        {/* Lado Esquerdo: Lista de Clientes com Busca e Filtros */}
        <View style={styles.leftListColumn}>
          {/* Busca e Toggle de Favoritos */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar cliente ou empresa..."
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

            <TouchableOpacity
              style={[styles.favFilterBtn, onlyFavorites && styles.favFilterBtnActive]}
              onPress={() => setOnlyFavorites(!onlyFavorites)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={onlyFavorites ? 'star' : 'star-outline'}
                size={22}
                color={onlyFavorites ? colors.accentOrange : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Lista de Contatos Táteis */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
            {filteredClients.map((client) => {
              const isSelected = selectedClient.id === client.id;
              return (
                <TouchableOpacity
                  key={client.id}
                  style={[styles.clientCardItem, isSelected && styles.clientCardItemActive]}
                  onPress={() => setSelectedClient(client)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarCircle, { backgroundColor: client.avatarBg }]}>
                    <Text style={styles.avatarInitials}>{client.avatarInitials}</Text>
                  </View>

                  <View style={styles.clientSummaryCol}>
                    <View style={styles.clientNameRow}>
                      <Text style={styles.clientNameText} numberOfLines={1}>
                        {client.name}
                      </Text>
                      {client.isFavorite && (
                        <Ionicons name="star" size={14} color={colors.accentOrange} />
                      )}
                    </View>
                    <Text style={styles.clientCompanyText} numberOfLines={1}>
                      {client.company}
                    </Text>
                    <Text style={styles.clientRoleText} numberOfLines={1}>
                      {client.role}
                    </Text>
                  </View>

                  <View style={styles.statusIndicatorBox}>
                    <Text style={styles.statusBadgeText}>{client.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lado Direito: Detalhes do Cliente Selecionado e Ações Veiculares Rápidas */}
        <View style={styles.rightDetailColumn}>
          {selectedClient ? (
            <View style={styles.detailCard}>
              {/* Header do Perfil do Cliente */}
              <View style={styles.profileHeaderRow}>
                <View style={[styles.largeAvatar, { backgroundColor: selectedClient.avatarBg }]}>
                  <Text style={styles.largeAvatarText}>{selectedClient.avatarInitials}</Text>
                </View>

                <View style={styles.profileInfoCol}>
                  <View style={styles.profileTitleRow}>
                    <Text style={styles.profileName}>{selectedClient.name}</Text>
                    <View style={styles.vipTag}>
                      <Text style={styles.vipTagText}>{selectedClient.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.profileCompany}>{selectedClient.company}</Text>
                  <Text style={styles.profileRole}>{selectedClient.role}</Text>
                </View>
              </View>

              {/* Informações de Contato e Localização */}
              <View style={styles.contactFieldsBox}>
                <View style={styles.fieldItem}>
                  <Ionicons name="call-outline" size={22} color={colors.accentBlue} />
                  <View style={styles.fieldTextCol}>
                    <Text style={styles.fieldLabel}>TELEFONE COMERCIAL</Text>
                    <Text style={styles.fieldValue}>{selectedClient.phone}</Text>
                  </View>
                </View>

                <View style={styles.fieldItem}>
                  <Ionicons name="location-outline" size={22} color={colors.primary} />
                  <View style={styles.fieldTextCol}>
                    <Text style={styles.fieldLabel}>ENDEREÇO DA EMPRESA</Text>
                    <Text style={styles.fieldValue}>{selectedClient.address}</Text>
                  </View>
                </View>
              </View>

              {/* Card de Chamada Ativa (Caso em ligação) */}
              {callActive && (
                <View style={styles.activeCallBanner}>
                  <View style={styles.activeCallPulse} />
                  <Text style={styles.activeCallText}>Chamada em andamento no Viva-Voz...</Text>
                  <TouchableOpacity
                    onPress={() => setCallActive(false)}
                    style={styles.hangUpBtn}
                  >
                    <Ionicons name="call" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Ações Táteis Rápidas ao Volante */}
              <View style={styles.tactileActionsGrid}>
                <AutomotiveButton
                  title={callActive ? 'Encerrar Ligação' : 'Ligar no Viva-Voz'}
                  variant={callActive ? 'danger' : 'primary'}
                  size="large"
                  icon="call"
                  onPress={() => setCallActive(!callActive)}
                  style={styles.actionBtnGrid}
                />

                <AutomotiveButton
                  title="Traçar Rota Direta"
                  variant="glass"
                  size="large"
                  icon="navigate"
                  onPress={() => {
                    if (onNavigateToRoute) onNavigateToRoute(selectedClient);
                  }}
                  style={styles.actionBtnGrid}
                />
              </View>

              {/* Mensagens Rápidas com 1 Toque */}
              <View style={styles.quickMessagesContainer}>
                <Text style={styles.quickMsgHeader}>MENSAGENS RÁPIDAS AUTOMOTIVAS</Text>
                <View style={styles.quickMsgRow}>
                  <TouchableOpacity style={styles.quickMsgPill}>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.accentGreen} />
                    <Text style={styles.quickMsgText}>"Estou a caminho"</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.quickMsgPill}>
                    <Ionicons name="time-outline" size={16} color={colors.accentOrange} />
                    <Text style={styles.quickMsgText}>"Chegando em 10 minutos"</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.quickMsgPill}>
                    <Ionicons name="car-outline" size={16} color={colors.accentBlue} />
                    <Text style={styles.quickMsgText}>"Cheguei na recepção"</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptySelection}>
              <Ionicons name="person-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Selecione um cliente para visualizar os detalhes.</Text>
            </View>
          )}
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
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: layout.spacing.xl,
    gap: layout.spacing.xl,
  },
  leftListColumn: {
    flex: 0.44,
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: layout.spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: layout.spacing.md,
  },
  searchBox: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceSubtle,
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
  favFilterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favFilterBtnActive: {
    borderColor: colors.accentOrange,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
  },
  listContainer: {
    gap: 8,
  },
  clientCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: layout.radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  clientCardItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated || '#22222D',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typography.title3,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  clientSummaryCol: {
    flex: 1,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientNameText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clientCompanyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clientRoleText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusIndicatorBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: layout.radius.pill,
  },
  statusBadgeText: {
    ...typography.caption,
    color: colors.accentCyan,
    fontSize: 10,
  },
  rightDetailColumn: {
    flex: 0.56,
  },
  detailCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: layout.spacing.xl,
    justifyContent: 'space-between',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.spacing.lg,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatarText: {
    ...typography.hero,
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  profileInfoCol: {
    flex: 1,
  },
  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileName: {
    ...typography.title1,
    color: colors.textPrimary,
  },
  vipTag: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: layout.radius.pill,
  },
  vipTagText: {
    ...typography.caption,
    color: colors.accentBlue,
  },
  profileCompany: {
    ...typography.title3,
    color: colors.textSecondary,
    marginTop: 4,
  },
  profileRole: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  contactFieldsBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: layout.radius.lg,
    padding: layout.spacing.lg,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fieldTextCol: {
    flex: 1,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  fieldValue: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  activeCallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    padding: 12,
    borderRadius: layout.radius.lg,
    borderWidth: 1,
    borderColor: colors.accentGreen,
    gap: 12,
  },
  activeCallPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentGreen,
  },
  activeCallText: {
    ...typography.body,
    color: colors.accentGreen,
    fontWeight: '700',
    flex: 1,
  },
  hangUpBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tactileActionsGrid: {
    flexDirection: 'row',
    gap: layout.spacing.lg,
  },
  actionBtnGrid: {
    flex: 1,
  },
  quickMessagesContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: layout.radius.lg,
    padding: layout.spacing.md,
  },
  quickMsgHeader: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 8,
  },
  quickMsgRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickMsgPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: layout.radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  quickMsgText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  emptySelection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 10,
  },
});
