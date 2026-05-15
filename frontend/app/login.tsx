import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Footer from '../components/Footer';

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};

const roles = [
  { id: 'citizen', title: 'Citizen Portal', desc: 'Report civic issues, track resolution progress, and earn participation points.', color: '#1e1e2e', route: '/citizen-login' },
  { id: 'officer', title: 'Officer Dashboard', desc: 'Review assigned issues, update statuses, and submit resolution reports.', color: '#8b6914', route: '/officer-login' },
  { id: 'contractor', title: 'Contractor Portal', desc: 'Browse unresolved issues, submit competitive bids, and complete assigned repairs.', color: '#4a7c59', route: '/contractor-login' },
  { id: 'admin', title: 'Admin Console', desc: 'Manage wards, officers, contractors, and monitor analytics.', color: '#c9a227', route: '/admin-login' },
];

export default function LoginScreen() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={[s.card, glass]}>
        <View style={s.header}>
          <View style={s.logoDot} />
          <Text style={s.title}>Dashboard Access</Text>
          <Text style={s.subtitle}>Select your role to continue to the appropriate portal.</Text>
        </View>
        {roles.map((role) => (
          <TouchableOpacity key={role.id} style={s.roleCard}
            onPress={() => router.push(role.route as any)} activeOpacity={0.7}>
            <View style={[s.roleAccent, { backgroundColor: role.color }]} />
            <View style={s.roleText}>
              <Text style={[s.roleName, { color: role.color }]}>{role.title}</Text>
              <Text style={s.roleDesc}>{role.desc}</Text>
            </View>
            <Text style={[s.arrow, { color: role.color }]}>&#8594;</Text>
          </TouchableOpacity>
        ))}
        <View style={s.divider} />
        <TouchableOpacity style={s.signupCta} onPress={() => router.push('/signup')}>
          <Text style={s.signupLabel}>New to UrbanLens?</Text>
          <Text style={s.signupLink}>Create a Citizen Account &#8594;</Text>
        </TouchableOpacity>
      </View>
      <Footer />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: '100%' as any },
  card: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 24, padding: 36, width: '100%', maxWidth: 480, borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)', marginBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#c9a227', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#1e1e2e', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#8b7e6a', marginTop: 6, textAlign: 'center' },
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, padding: 18, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  roleAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  roleText: { flex: 1, marginLeft: 8 },
  roleName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  roleDesc: { fontSize: 12, color: '#8b7e6a', lineHeight: 18 },
  arrow: { fontSize: 18, fontWeight: '600', marginLeft: 12 },
  divider: { height: 1, backgroundColor: 'rgba(200,180,140,0.25)', marginVertical: 20 },
  signupCta: { alignItems: 'center', padding: 16, backgroundColor: 'rgba(201,162,39,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(201,162,39,0.15)' },
  signupLabel: { fontSize: 12, color: '#8b7e6a' },
  signupLink: { fontSize: 14, color: '#1e1e2e', fontWeight: '700', marginTop: 4 },
});