// App.js
import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { colors } from './src/theme/colors';
import { HomeScreen } from './src/screens/HomeScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');

  // Carregamento de todas as variantes oficiais de SF Pro Display fornecidas
  const [fontsLoaded] = useFonts({
    'SFProDisplay-Bold': require('./src/fonts/SF-Pro-Display-Bold.otf'),
    'SFProDisplay-Semibold': require('./src/fonts/SF-Pro-Display-Semibold.otf'),
    'SFProDisplay-Medium': require('./src/fonts/SF-Pro-Display-Medium.otf'),
    'SFProDisplay-Regular': require('./src/fonts/SF-Pro-Display-Regular.otf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.actionBlue} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" hidden={false} />
      <View style={styles.viewportContainer}>
        {/* Renderiza a tela de início fiel ao Design System Apple Maps adaptado para GoClient */}
        <HomeScreen onNavigate={(screen) => setCurrentScreen(screen)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.sidebarBackground,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#EBF4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportContainer: {
    flex: 1,
    backgroundColor: colors.sidebarBackground,
    overflow: 'hidden',
  },
});
