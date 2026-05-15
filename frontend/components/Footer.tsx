import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function Footer() {
  const router = useRouter();
  return (
    <View style={s.footer}>
      <View style={s.top}>
        <View style={s.col}>
          <View style={s.logoRow}>
            <View style={s.dot} />
            <Text style={s.brand}>UrbanLens</Text>
          </View>
          <Text style={s.desc}>AI-powered civic infrastructure tracker empowering citizens to report, track, and resolve urban issues in real time.</Text>
        </View>
        <View style={s.col}>
          <Text style={s.heading}>Platform</Text>
          <TouchableOpacity onPress={() => router.push('/about')}><Text style={s.link}>About Us</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/how-it-works')}><Text style={s.link}>How It Works</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login')}><Text style={s.link}>Dashboard</Text></TouchableOpacity>
        </View>
        <View style={s.col}>
          <Text style={s.heading}>Get Started</Text>
          <TouchableOpacity onPress={() => router.push('/signup')}><Text style={s.link}>Create Account</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/issues')}><Text style={s.link}>Report an Issue</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login')}><Text style={s.link}>Sign In</Text></TouchableOpacity>
        </View>
        <View style={s.col}>
          <Text style={s.heading}>Technology</Text>
          <Text style={s.link}>Gemini Vision AI</Text>
          <Text style={s.link}>PostGIS Deduplication</Text>
          <Text style={s.link}>React Native + Expo</Text>
        </View>
      </View>
      <View style={s.bottom}>
        <Text style={s.copy}>&copy; 2026 UrbanLens. All rights reserved.</Text>
        <Text style={s.credit}>Team Techno-5 &middot; BMSCE MCA Hackathon 2026</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  footer: { backgroundColor: '#1e1e2e', paddingTop: 40, paddingBottom: 24, paddingHorizontal: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 32, paddingBottom: 32, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  col: { minWidth: 180, maxWidth: 280 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#c9a227', marginRight: 8 },
  brand: { fontSize: 18, fontWeight: '700', color: '#fff' },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 20 },
  heading: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1.2 },
  link: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copy: { fontSize: 12, color: 'rgba(255,255,255,0.2)' },
  credit: { fontSize: 12, color: 'rgba(255,255,255,0.2)' },
});
