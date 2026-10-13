// App.js
import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme/colors';
import { AutomotiveSidebar } from './src/components/AutomotiveSidebar';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MapScreen } from './src/screens/MapScreen';
import { MusicScreen } from './src/screens/MusicScreen';
import { ContactsScreen } from './src/screens/ContactsScreen';
import { RoutesScreen } from './src/screens/RoutesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

export default function App() {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const { width, height } = useWindowDimensions();

  // Garante que o layout se ajuste harmoniosamente mantendo proporção de tela automotiva
  const isLandscape = width >= height;

  const handleCompleteOnboarding = () => {
    setIsOnboardingActive(false);
    setCurrentScreen('home');
  };

  const handleOpenOnboarding = () => {
    setIsOnboardingActive(true);
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenOnboarding={handleOpenOnboarding}
          />
        );
      case 'map':
        return <MapScreen onNavigate={(screen) => setCurrentScreen(screen)} />;
      case 'music':
        return <MusicScreen />;
      case 'contacts':
        return (
          <ContactsScreen
            onNavigateToRoute={(client) => {
              setCurrentScreen('map');
            }}
          />
        );
      case 'routes':
        return (
          <RoutesScreen
            onStartRoute={(route) => {
              setCurrentScreen('map');
            }}
          />
        );
      case 'settings':
        return <SettingsScreen onOpenOnboarding={handleOpenOnboarding} />;
      default:
        return (
          <HomeScreen
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenOnboarding={handleOpenOnboarding}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" hidden={false} />
      <View style={styles.viewportContainer}>
        {isOnboardingActive ? (
          <OnboardingScreen onComplete={handleCompleteOnboarding} />
        ) : (
          <View style={styles.mainShell}>
            {/* Barra de Navegação Lateral Automotiva */}
            <AutomotiveSidebar
              currentScreen={currentScreen}
              onSelectScreen={(screen) => setCurrentScreen(screen)}
            />

            {/* Painel de Conteúdo da Tela Selecionada */}
            <View style={styles.contentViewport}>
              {renderActiveScreen()}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  viewportContainer: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  mainShell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  contentViewport: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
