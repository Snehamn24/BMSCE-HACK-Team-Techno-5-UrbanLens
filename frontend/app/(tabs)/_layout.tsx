import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: Platform.select({
          web: { display: 'none' },
          default: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e8e0d4',
            height: 60,
            paddingBottom: 6,
            paddingTop: 6,
            elevation: 8,
            shadowColor: '#1a1a2e',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
          },
        }),
        tabBarActiveTintColor: '#1a1a2e',
        tabBarInactiveTintColor: '#b0a898',
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 10,
          letterSpacing: 0.3,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => null }} />
    </Tabs>
  );
}
