import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const roles = [
  {
    id: 'citizen',
    emoji: '🏠',
    title: 'Citizen',
    subtitle: 'Report civic issues & earn points',
    color: '#1e90ff',
    bgColor: '#e3f2fd',
    route: '/citizen-login',
  },
  {
    id: 'officer',
    emoji: '👷',
    title: 'Municipal Officer',
    subtitle: 'Review & resolve assigned issues',
    color: '#2e7d32',
    bgColor: '#e8f5e9',
    route: '/officer-login',
  },
  {
    id: 'admin',
    emoji: '🛡️',
    title: 'Admin / Supervisor',
    subtitle: 'Analytics, monitoring & management',
    color: '#6a1b9a',
    bgColor: '#f3e5f5',
    route: '/admin-login',
  },
];

export default function LoginScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🔍</Text>
        <Text style={styles.title}>Urban Lens</Text>
        <Text style={styles.subtitle}>Select your role to continue</Text>
      </View>

      {roles.map((role) => (
        <TouchableOpacity
          key={role.id}
          style={[styles.card, { borderLeftColor: role.color }]}
          onPress={() => router.push(role.route as any)}
          activeOpacity={0.7}
          accessibilityLabel={`Login as ${role.title}`}
          accessibilityRole="button"
        >
          <View style={[styles.iconBox, { backgroundColor: role.bgColor }]}>
            <Text style={styles.emoji}>{role.emoji}</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: role.color }]}>{role.title}</Text>
            <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
          </View>
          <Text style={[styles.arrow, { color: role.color }]}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.signupButton}
        onPress={() => router.push('/signup')}
        accessibilityLabel="Create new citizen account"
        accessibilityRole="button"
      >
        <Text style={styles.signupText}>
          New citizen? <Text style={styles.signupLink}>Create Account</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#f4f6fb', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 15, color: '#888', marginTop: 6 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 18, marginBottom: 14,
    borderLeftWidth: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
    shadowRadius: 8, elevation: 3,
  },
  iconBox: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 28 },
  cardText: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  cardSubtitle: { fontSize: 13, color: '#888', lineHeight: 18 },
  arrow: { fontSize: 32, fontWeight: 'bold', marginLeft: 8 },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 20 },
  signupButton: { alignItems: 'center', paddingVertical: 10 },
  signupText: { fontSize: 14, color: '#666' },
  signupLink: { color: '#1e90ff', fontWeight: 'bold' },
});