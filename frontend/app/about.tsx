import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Footer from '../components/Footer';

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};

export default function About() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.hero}>
        <Text style={s.heroLabel}>ABOUT THE PLATFORM</Text>
        <Text style={s.heroTitle}>UrbanLens</Text>
        <Text style={s.heroTag}>AI-Powered Civic Infrastructure Tracker for Indian Cities</Text>
      </View>
      <View style={[s.card, glass]}>
        <Text style={s.cardLabel}>MISSION</Text>
        <Text style={s.cardTitle}>Why UrbanLens Exists</Text>
        <Text style={s.cardText}>Rapid urbanization in Indian cities outpaces infrastructure maintenance. Citizens complain about potholes, broken streetlights, and illegal garbage dumps — but data is fragmented and hard for municipal bodies like BBMP to process. UrbanLens bridges this gap with AI-driven validation, classification, and routing.</Text>
      </View>
      <View style={[s.card, glass]}>
        <Text style={s.cardLabel}>CAPABILITIES</Text>
        <Text style={s.cardTitle}>Core Features</Text>
        {['Computer Vision — Gemini AI detects issue type and assigns severity from uploaded photos',
          'Geo-Deduplication — PostGIS merges reports within 10m radius to prevent spam',
          'Gamification — Points and badge system (Bronze/Silver/Gold) encourages civic participation',
          'Ward Routing — Issues routed to correct municipal ward for efficient resolution',
          'Resolution Tracking — Before/after photo comparison with citizen feedback ratings'].map((item, i) => (
          <View key={i} style={s.bulletRow}>
            <View style={s.bullet} />
            <Text style={s.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={[s.card, glass]}>
        <Text style={s.cardLabel}>ARCHITECTURE</Text>
        <Text style={s.cardTitle}>Ward-Based Routing System</Text>
        <Text style={s.cardText}>Administrators create municipal ward offices through the admin console. Citizens select their ward when filing reports. Issues are automatically assigned to officers based on ward jurisdiction, ensuring every report reaches the correct authority.</Text>
      </View>
      <View style={[s.card, glass]}>
        <Text style={s.cardLabel}>TEAM</Text>
        <Text style={s.cardTitle}>Built By</Text>
        <Text style={s.cardText}>Team Techno-5 — BMSCE MCA Hackathon 2026{'\n'}Technology: Gemini Vision AI, PostGIS, Node.js, React Native, PostgreSQL</Text>
      </View>
      <TouchableOpacity style={s.cta} onPress={() => router.push('/issues')}>
        <Text style={s.ctaText}>Report a Civic Issue</Text>
      </TouchableOpacity>
      <Footer />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingHorizontal: 40, paddingBottom: 0 },
  hero: { paddingVertical: 32, marginBottom: 20 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#c9a227', letterSpacing: 2, marginBottom: 12 },
  heroTitle: { fontSize: 40, fontWeight: '800', color: '#1e1e2e', letterSpacing: -1, marginBottom: 10 },
  heroTag: { fontSize: 15, color: '#6b6352', lineHeight: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 20, padding: 28, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  cardLabel: { fontSize: 10, fontWeight: '700', color: '#c9a227', letterSpacing: 1.5, marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 12 },
  cardText: { fontSize: 14, color: '#6b6352', lineHeight: 22 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#c9a227', marginRight: 12, marginTop: 8 },
  bulletText: { fontSize: 13, color: '#6b6352', flex: 1, lineHeight: 20 },
  cta: { backgroundColor: '#1e1e2e', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});