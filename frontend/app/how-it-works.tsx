import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import Footer from '../components/Footer';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};

const steps = [
  { num: '01', title: 'Capture & Upload', desc: 'Citizens photograph a civic issue — pothole, garbage, broken streetlight — directly within the app. GPS coordinates and timestamp are auto-attached.' },
  { num: '02', title: 'AI Classification', desc: 'Google Gemini Vision AI analyzes the uploaded image, classifies the issue type, and assigns a severity score (low/medium/high) — all within seconds.' },
  { num: '03', title: 'Spatial Deduplication', desc: 'PostGIS queries check for existing reports within a 10-meter radius. Matching reports are merged with upvote aggregation instead of creating duplicates.' },
  { num: '04', title: 'Ward-Based Routing', desc: 'The validated report is routed to the correct municipal ward office. The assigned officer receives it with full context: photos, location, and AI severity.' },
  { num: '05', title: 'Resolution & Feedback', desc: 'Officers resolve issues and upload after-repair photos. Citizens earn 10 points per verified report and can rate the resolution quality.' },
];

export default function HowItWorks() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(0);
  const toggle = (i: number) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(expanded === i ? null : i); };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.hero}>
        <Text style={s.heroLabel}>PLATFORM WORKFLOW</Text>
        <Text style={s.heroTitle}>How It Works</Text>
        <Text style={s.heroDesc}>From photo capture to resolution — the complete lifecycle of a civic report.</Text>
      </View>
      {steps.map((step, i) => (
        <TouchableOpacity key={i} style={[s.stepCard, glass, expanded === i && s.stepActive]} onPress={() => toggle(i)} activeOpacity={0.85}>
          <View style={s.stepHeader}>
            <View style={[s.stepNum, expanded === i && s.stepNumActive]}><Text style={[s.stepNumText, expanded === i && { color: '#fff' }]}>{step.num}</Text></View>
            <Text style={[s.stepTitle, expanded === i && { color: '#1e1e2e' }]}>{step.title}</Text>
            <Text style={s.chevron}>{expanded === i ? '−' : '+'}</Text>
          </View>
          {expanded === i && <Text style={s.stepDesc}>{step.desc}</Text>}
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={s.cta} onPress={() => router.push('/issues')}>
        <Text style={s.ctaText}>Report a Civic Issue</Text>
      </TouchableOpacity>
      <Footer />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingHorizontal: 40, paddingBottom: 0 },
  hero: { paddingVertical: 32, marginBottom: 16 },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#c9a227', letterSpacing: 2, marginBottom: 12 },
  heroTitle: { fontSize: 36, fontWeight: '800', color: '#1e1e2e', letterSpacing: -0.5, marginBottom: 10 },
  heroDesc: { fontSize: 15, color: '#6b6352', lineHeight: 24, maxWidth: 500 },
  stepCard: { backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 16, padding: 20, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: 'transparent', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  stepActive: { borderLeftColor: '#1e1e2e', backgroundColor: 'rgba(255,255,255,0.65)' },
  stepHeader: { flexDirection: 'row', alignItems: 'center' },
  stepNum: { backgroundColor: 'rgba(200,180,140,0.2)', borderRadius: 8, width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  stepNumActive: { backgroundColor: '#1e1e2e' },
  stepNumText: { fontSize: 12, fontWeight: '800', color: '#8b7e6a' },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#8b7e6a' },
  chevron: { fontSize: 18, color: '#b0a898', fontWeight: '300' },
  stepDesc: { marginTop: 16, fontSize: 14, color: '#6b6352', lineHeight: 22, paddingLeft: 50 },
  cta: { backgroundColor: '#1e1e2e', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16, marginBottom: 40 },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});