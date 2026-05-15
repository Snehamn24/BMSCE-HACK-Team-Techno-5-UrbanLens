import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Platform } from 'react-native';
import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import Footer from '../../components/Footer';

const { width: SW } = Dimensions.get('window');

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 40, friction: 9 }),
    ]).start();
  }, []);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* HERO */}
        <View style={s.heroSection}>
          <View style={s.heroCard}>
            <Text style={s.heroLabel}>AI-POWERED CIVIC INFRASTRUCTURE</Text>
            <Text style={s.heroTitle}>Smart City{'\n'}Issue Tracker</Text>
            <Text style={s.heroDesc}>
              Report potholes, garbage dumps, and broken streetlights. Our Gemini Vision AI validates, classifies, and routes issues to the right municipal ward automatically.
            </Text>
            <View style={s.heroActions}>
              <TouchableOpacity style={s.heroPrimary} onPress={() => router.push('/issues')} activeOpacity={0.85}>
                <Text style={s.heroPrimaryText}>Report an Issue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.heroSecondary} onPress={() => router.push('/how-it-works')} activeOpacity={0.85}>
                <Text style={s.heroSecondaryText}>Learn More</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* METRICS */}
        <View style={s.metricsRow}>
          {[
            { num: '500+', label: 'Issues Reported' },
            { num: '320+', label: 'Cases Resolved' },
            { num: '15', label: 'Wards Active' },
            { num: '98%', label: 'AI Accuracy' },
          ].map((m, i) => (
            <View key={i} style={[s.metricCard, glass]}>
              <Text style={s.metricNum}>{m.num}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* ABOUT SECTION */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ABOUT THE PLATFORM</Text>
          <Text style={s.sectionTitle}>Bridging Citizens and Authorities</Text>
          <Text style={s.sectionDesc}>
            UrbanLens is a crowdsourced, AI-driven civic reporting platform designed for Indian cities. It tackles fragmented complaint data by automatically validating, categorizing, and prioritizing infrastructure issues — helping municipal bodies like BBMP process reports efficiently.
          </Text>
        </View>

        {/* FEATURES */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>CORE CAPABILITIES</Text>
          <Text style={s.sectionTitle}>How We Make Cities Smarter</Text>
          <View style={s.featureGrid}>
            {[
              { title: 'Computer Vision', desc: 'Gemini AI analyzes uploaded photos to detect issue type — pothole, garbage, streetlight — and assigns a severity score automatically.', accent: '#c9a227' },
              { title: 'Geo-Deduplication', desc: 'PostGIS spatial queries merge reports within a 10-meter radius, preventing duplicate tickets and aggregating community upvotes.', accent: '#1e1e2e' },
              { title: 'Gamification Engine', desc: 'Citizens earn 10 points per verified report. Climb through Bronze, Silver, and Gold tiers to encourage sustained civic participation.', accent: '#8b6914' },
              { title: 'Ward-Based Routing', desc: 'Issues are automatically routed to the correct municipal ward office. Officers see only their assigned area for efficient resolution.', accent: '#4a4a5a' },
            ].map((f, i) => (
              <View key={i} style={[s.featureCard, glass]}>
                <View style={[s.featureAccent, { backgroundColor: f.accent }]} />
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ROLES */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>USER ROLES</Text>
          <Text style={s.sectionTitle}>Three Dashboards, One Platform</Text>
          <View style={s.rolesRow}>
            {[
              { title: 'Citizen Portal', desc: 'Report issues, track resolution status, earn civic points and badges, and rate completed repairs.', color: '#1e1e2e' },
              { title: 'Officer Dashboard', desc: 'Review ward-assigned issues, update statuses, upload after-repair photos, and manage resolutions.', color: '#8b6914' },
              { title: 'Admin Console', desc: 'Manage wards, create officer accounts, view analytics, and monitor city-wide infrastructure health.', color: '#c9a227' },
            ].map((r, i) => (
              <View key={i} style={[s.roleCard, glass]}>
                <View style={[s.roleLine, { backgroundColor: r.color }]} />
                <Text style={s.roleTitle}>{r.title}</Text>
                <Text style={s.roleDesc}>{r.desc}</Text>
                <TouchableOpacity style={[s.roleBtn, { borderColor: r.color }]} onPress={() => router.push('/login')}>
                  <Text style={[s.roleBtnText, { color: r.color }]}>Access Dashboard</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={s.ctaBanner}>
          <Text style={s.ctaTitle}>Ready to improve your city?</Text>
          <Text style={s.ctaDesc}>Join thousands of citizens making a difference through verified civic reporting.</Text>
          <View style={s.ctaActions}>
            <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/signup')} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Create Free Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ctaOutline} onPress={() => router.push('/login')} activeOpacity={0.85}>
              <Text style={s.ctaOutlineText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TECH STACK */}
        <View style={s.techRow}>
          {['Gemini Vision AI', 'PostGIS', 'Node.js', 'React Native', 'PostgreSQL', 'Expo'].map((t, i) => (
            <View key={i} style={[s.techChip, glass]}>
              <Text style={s.techText}>{t}</Text>
            </View>
          ))}
        </View>

      </Animated.View>
      <Footer />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 0 },

  heroSection: { paddingHorizontal: 40, paddingTop: 40, paddingBottom: 20 },
  heroCard: { maxWidth: 600 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#c9a227', letterSpacing: 2, marginBottom: 16 },
  heroTitle: { fontSize: 52, fontWeight: '800', color: '#1e1e2e', letterSpacing: -1.5, lineHeight: 58, marginBottom: 20 },
  heroDesc: { fontSize: 16, color: '#6b6352', lineHeight: 26, maxWidth: 520, marginBottom: 32 },
  heroActions: { flexDirection: 'row', gap: 14 },
  heroPrimary: { backgroundColor: '#1e1e2e', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  heroPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  heroSecondary: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#1e1e2e' },
  heroSecondaryText: { color: '#1e1e2e', fontWeight: '600', fontSize: 14 },

  metricsRow: { flexDirection: 'row', paddingHorizontal: 40, gap: 16, marginBottom: 40 },
  metricCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  metricNum: { fontSize: 28, fontWeight: '800', color: '#1e1e2e', marginBottom: 4 },
  metricLabel: { fontSize: 12, color: '#8b7e6a', fontWeight: '500' },

  section: { paddingHorizontal: 40, marginBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#c9a227', letterSpacing: 2, marginBottom: 8 },
  sectionTitle: { fontSize: 28, fontWeight: '800', color: '#1e1e2e', letterSpacing: -0.5, marginBottom: 12 },
  sectionDesc: { fontSize: 15, color: '#6b6352', lineHeight: 24, maxWidth: 600 },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  featureCard: { width: (SW - 112) / 2, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 24, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)', overflow: 'hidden', minWidth: 260 },
  featureAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e2e', marginBottom: 8, marginTop: 4 },
  featureDesc: { fontSize: 13, color: '#6b6352', lineHeight: 20 },

  rolesRow: { flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' },
  roleCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 24, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)', overflow: 'hidden', minWidth: 240 },
  roleLine: { width: 32, height: 3, borderRadius: 2, marginBottom: 16 },
  roleTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e2e', marginBottom: 8 },
  roleDesc: { fontSize: 13, color: '#6b6352', lineHeight: 20, marginBottom: 18 },
  roleBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1.5, alignSelf: 'flex-start' },
  roleBtnText: { fontSize: 12, fontWeight: '700' },

  ctaBanner: { marginHorizontal: 40, marginBottom: 40, backgroundColor: '#1e1e2e', borderRadius: 20, padding: 40, alignItems: 'center' },
  ctaTitle: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10 },
  ctaDesc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: 28, maxWidth: 420 },
  ctaActions: { flexDirection: 'row', gap: 14 },
  ctaBtn: { backgroundColor: '#c9a227', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  ctaBtnText: { color: '#1e1e2e', fontWeight: '700', fontSize: 14 },
  ctaOutline: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  ctaOutlineText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  techRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 40, marginBottom: 40 },
  techChip: { backgroundColor: 'rgba(255,255,255,0.45)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  techText: { fontSize: 12, color: '#6b6352', fontWeight: '600' },
});