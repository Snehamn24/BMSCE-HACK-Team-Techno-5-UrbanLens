import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '../context/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Urban Lens' }} />
          <Stack.Screen name="login" options={{ title: 'Login', headerShown: true }} />
          <Stack.Screen name="signup" options={{ title: 'Sign Up', headerShown: true }} />
          <Stack.Screen name="about" options={{ title: 'About Urban Lens', headerShown: true }} />
          <Stack.Screen name="how-it-works" options={{ title: 'How It Works', headerShown: true }} />
          <Stack.Screen name="issues" options={{ title: 'Report Issue', headerShown: true }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
