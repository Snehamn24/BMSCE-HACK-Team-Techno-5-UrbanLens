import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function Navbar() {
  const router = useRouter();

  const go = (route: string) => {
    try { router.navigate(route as any); } catch { router.push(route as any); }
  };

  return (
    <View style={s.navbar}>
      <TouchableOpacity style={s.logoWrap} onPress={() => go('/')} activeOpacity={0.8}>
        <View style={s.logoDot} />
        <Text style={s.logoText}>UrbanLens</Text>
      </TouchableOpacity>

      <View style={s.navLinks}>
        {[
          { label: 'Home', route: '/' },
          { label: 'About', route: '/about' },
          { label: 'How It Works', route: '/how-it-works' },
          { label: 'Dashboard', route: '/login' },
        ].map((link, i) => (
          <TouchableOpacity key={i} onPress={() => go(link.route)} style={s.navLink}>
            <Text style={s.navLinkText}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.rightSection}>
        <TouchableOpacity style={s.loginBtn} onPress={() => go('/login')} activeOpacity={0.8}>
          <Text style={s.loginText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.signupBtn} onPress={() => go('/signup')} activeOpacity={0.8}>
          <Text style={s.signupText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(30,30,46,0.95)',
    paddingHorizontal: 32, paddingVertical: 16,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    zIndex: 100,
  } as any,
  logoWrap: { flexDirection: 'row', alignItems: 'center' },
  logoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#c9a227', marginRight: 10 },
  logoText: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  navLinks: { flexDirection: 'row', gap: 4 },
  navLink: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  navLinkText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },

  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loginBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  loginText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  signupBtn: { backgroundColor: '#c9a227', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  signupText: { color: '#1e1e2e', fontSize: 13, fontWeight: '700' },
});
