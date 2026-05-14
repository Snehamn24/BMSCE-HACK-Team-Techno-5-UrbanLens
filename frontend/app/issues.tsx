import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';

const issueTypes = [
  {
    id: 'pothole',
    emoji: '🕳️',
    label: 'Report Pothole',
    color: '#1e90ff',
    description: 'Damaged road surface that can harm vehicles & pedestrians',
  },
  {
    id: 'garbage',
    emoji: '🗑️',
    label: 'Report Garbage',
    color: '#4caf50',
    description: 'Uncollected waste or illegal dumping in public areas',
  },
  {
    id: 'streetlight',
    emoji: '💡',
    label: 'Broken Streetlight',
    color: '#ff9800',
    description: 'Non-functioning street lamp creating safety hazards at night',
  },
  {
    id: 'drainage',
    emoji: '💧',
    label: 'Blocked Drain',
    color: '#9c27b0',
    description: 'Clogged drainage causing waterlogging or flooding',
  },
  {
    id: 'tree',
    emoji: '🌳',
    label: 'Fallen Tree',
    color: '#795548',
    description: 'Tree blocking road or posing danger to public',
  },
];

export default function IssuesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeIssue, setActiveIssue] = useState<string | null>(null);

  const simulateAI = (type: string, label: string) => {
    setLoading(true);
    setActiveIssue(type);
    setTimeout(() => {
      setLoading(false);
      setActiveIssue(null);
      Alert.alert(
        '✅ AI Validation Successful',
        `We detected a ${label}.\n📍 Location tagged.\n🏆 +10 Points added to your profile!`,
        [{ text: 'Awesome!', style: 'default' }]
      );
    }, 2000);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Civic Tracker</Text>
        <Text style={styles.subtitle}>Spot an issue? Report it and earn points 🏆</Text>
      </View>

      {issueTypes.map((issue) => (
        <TouchableOpacity
          key={issue.id}
          style={[styles.card, { borderLeftColor: issue.color }]}
          onPress={() => simulateAI(issue.id, issue.label)}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityLabel={`Report ${issue.label}`}
          accessibilityRole="button"
        >
          <View style={styles.cardLeft}>
            <View style={[styles.emojiBox, { backgroundColor: issue.color + '20' }]}>
              <Text style={styles.cardEmoji}>{issue.emoji}</Text>
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardTitle}>{issue.label}</Text>
              <Text style={styles.cardDesc}>{issue.description}</Text>
            </View>
          </View>
          {loading && activeIssue === issue.id ? (
            <ActivityIndicator size="small" color={issue.color} />
          ) : (
            <Text style={[styles.reportArrow, { color: issue.color }]}>›</Text>
          )}
        </TouchableOpacity>
      ))}

      {loading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="large" color="#1e90ff" />
          <Text style={styles.loadingText}>AI is analyzing your photo...</Text>
        </View>
      )}

      <View style={styles.pointsInfo}>
        <Text style={styles.pointsTitle}>🎯 How Points Work</Text>
        <Text style={styles.pointsText}>
          Each validated report earns you{' '}
          <Text style={styles.bold}>10 civic points</Text>. Climb the leaderboard and earn
          badges for being an active citizen!
        </Text>
      </View>
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
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  reportArrow: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#1e90ff',
    fontWeight: '600',
  },
  pointsInfo: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  pointsTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  pointsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#1e90ff',
  },
});