import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ImageBackground, Platform, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export const unstable_settings = { anchor: '(tabs)' };

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1e1e2e',
    background: 'transparent',
    card: 'rgba(255,255,255,0.55)',
    text: '#1e1e2e',
    border: 'rgba(200,180,140,0.25)',
    notification: '#c9a227',
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={theme}>
        <ImageBackground
          source={require('../assets/images/bg_city.png')}
          style={s.bg}
          imageStyle={s.bgImage}
          resizeMode="cover"
        >
          <View style={s.overlay}>
            {Platform.OS === 'web' && <Navbar />}
            <View style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="login" />
                <Stack.Screen name="signup" />
                <Stack.Screen name="about" />
                <Stack.Screen name="how-it-works" />
                <Stack.Screen name="issues" />
                <Stack.Screen name="contractor-login" />
                <Stack.Screen name="contractor-dashboard" />
              </Stack>
            </View>
          </View>
        </ImageBackground>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  bgImage: { opacity: 0.08 },
  overlay: { flex: 1, backgroundColor: 'rgba(245,240,224,0.92)' },
});
