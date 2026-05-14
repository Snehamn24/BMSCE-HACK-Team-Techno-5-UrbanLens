import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const steps = [
  {
    emoji: '📸',
    number: '01',
    title: 'Capture the Issue',
    description:
      'Spot a pothole, broken streetlight, or garbage pile? Take a photo directly within the app. Your location is auto-tagged using GPS.',
  },
  {
    emoji: '🤖',
    number: '02',
    title: 'AI Classifies It',
    description:
      'Our AI model analyzes the photo, classifies the issue type (pothole, garbage, etc.), and assigns a severity score — all within seconds.',
  },
  {
    emoji: '📍',
    number: '03',
    title: 'Issue is Logged',
    description:
      'The classified issue is stored in our database with your location, timestamp, and severity. A unique report ID is generated for tracking.',
  },
  {
    emoji: '🏛️',
    number: '04',
    title: 'Authorities Notified',
    description:
      'The relevant municipal department receives an automated alert with all issue details and a priority score to act on it quickly.',
  },
  {
    emoji: '🏆',
    number: '05',
    title: 'You Earn Points',
    description:
      'Every validated report earns you civic points. Climb the leaderboard and earn badges as a responsible citizen making a difference!',
  },
];

export default function HowItWorks() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(0);

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === index ? null : index);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>⚙️</Text>
        <Text style={styles.headerTitle}>How Urban Lens Works</Text>
        <Text style={styles.headerSubtitle}>
          From photo to resolution — here's the full journey of a civic report.
        </Text>
      </View>

      {/* Steps */}
      {steps.map((step, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.stepCard, expanded === index && styles.stepCardExpanded]}
          onPress={() => toggle(index)}
          activeOpacity={0.85}
          accessibilityLabel={`Step ${step.number}: ${step.title}`}
          accessibilityRole="button"
        >
          <View style={styles.stepHeader}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumber}>{step.number}</Text>
            </View>
            <Text style={styles.stepEmoji}>{step.emoji}</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.chevron}>{expanded === index ? '▲' : '▼'}</Text>
          </View>
          {expanded === index && (
            <Text style={styles.stepDescription}>{step.description}</Text>
          )}
        </TouchableOpacity>
      ))}

      {/* CTA */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push('/issues')}
        accessibilityLabel="Try it now button"
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>🚀 Try It Now — Report an Issue</Text>
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
  header: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  headerEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0',
  },
  stepCardExpanded: {
    borderLeftColor: '#1e90ff',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumberBadge: {
    backgroundColor: '#1e90ff',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepEmoji: {
    fontSize: 22,
  },
  stepTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  chevron: {
    fontSize: 12,
    color: '#999',
  },
  stepDescription: {
    marginTop: 14,
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    paddingLeft: 4,
  },
  ctaButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
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