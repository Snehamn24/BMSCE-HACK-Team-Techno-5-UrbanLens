import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';

export default function About() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroEmoji}>🏙️</Text>
        <Text style={styles.heroTitle}>Urban Lens</Text>
        <Text style={styles.heroTagline}>AI-Powered Civic Infrastructure Tracker</Text>
      </View>

      {/* Mission */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Our Mission</Text>
        <Text style={styles.cardText}>
          Urban Lens bridges the gap between citizens and local authorities by making it effortless
          to report, track, and resolve civic infrastructure problems in real time.
        </Text>
      </View>

      {/* What We Do */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ What We Do</Text>
        {[
          'AI-powered issue detection from photos',
          'Automatic severity & category classification',
          'Real-time tracking & status updates',
          'Gamified citizen engagement with points',
          'Direct reporting to local authorities',
        ].map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>✅</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Team */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👥 Built By</Text>
        <Text style={styles.cardText}>
          Team Techno-5 — BMSCE Hackathon 2026{'\n'}
          Passionate engineers building smarter cities.
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push('/issues')}
        accessibilityLabel="Report an issue"
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>🚨 Report an Issue Now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f4f6fb',
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: '#1e90ff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  heroTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 15,
    color: '#444',
    flex: 1,
    lineHeight: 22,
  },
  ctaButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});