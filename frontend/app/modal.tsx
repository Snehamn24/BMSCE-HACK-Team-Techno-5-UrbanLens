import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🏙️</Text>
      <Text style={styles.title}>Urban Lens</Text>
      <Text style={styles.subtitle}>AI-Powered Civic Infrastructure Tracker</Text>

      <View style={styles.divider} />

      <Text style={styles.body}>
        Urban Lens helps citizens report civic issues — potholes, garbage, broken streetlights — using
        AI-powered photo analysis. Every report earns you points and helps make your city better.
      </Text>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
        accessibilityLabel="Close modal"
        accessibilityRole="button"
      >
        <Text style={styles.closeButtonText}>✕ Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f4f6fb',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 24,
  },
  body: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 36,
  },
  closeButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
