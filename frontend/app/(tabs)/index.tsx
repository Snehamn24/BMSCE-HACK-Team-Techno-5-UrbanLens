import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../../assets/images/background.jpg')}
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.5 }}
    >
      <View style={styles.overlay}>
        {/* Top Auth Buttons */}
        <View style={styles.topButtons}>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/login')}
            accessibilityLabel="Login button"
            accessibilityRole="button"
          >
            <Text style={styles.authText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/signup')}
            accessibilityLabel="Sign up button"
            accessibilityRole="button"
          >
            <Text style={styles.authText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Urban Lens</Text>
          <Text style={styles.subtitle}>AI Powered Civic Infrastructure Tracker</Text>

          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => router.push('/issues')}
            accessibilityLabel="Report civic issue button"
            accessibilityRole="button"
          >
            <Text style={styles.mainButtonText}>🚨 Report Civic Issue</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info Links */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/about')}
            accessibilityLabel="About Urban Lens"
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>About</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>•</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/how-it-works')}
            accessibilityLabel="How it works"
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>How It Works</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>•</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/modal')}
            accessibilityLabel="Open modal"
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>Info</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 55,
    paddingHorizontal: 20,
    gap: 10,
  },
  authButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  authText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 46,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 18,
    color: '#f0f0f0',
    textAlign: 'center',
    marginBottom: 44,
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mainButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 36,
    gap: 8,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  linkDivider: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});