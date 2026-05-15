import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image, Platform, Modal, TextInput, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

type Issue = { id: number; type: string; status: string; severity: string; description: string; image_url: string; after_image_url: string; latitude: number; longitude: number; reported_at: string; resolved_at: string; upvotes: number; feedback_rating: number | null; feedback_text: string | null; ward_office_name?: string; ward_number?: string; ward_area?: string; ai_confidence?: number; ai_detected_type?: string; ai_description?: string; };
type Ward = { id: number; office_name: string; ward_no: string; area_name: string; };

const typeEmojis: Record<string, string> = { pothole: '🕳️', garbage: '🗑️', streetlight: '💡', drainage: '💧', tree: '🌳' };
const severityColors: Record<string, string> = { low: '#059669', medium: '#d97706', high: '#ef4444' };

export default function CitizenDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxUri, setLightboxUri] = useState('');
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackIssue, setFeedbackIssue] = useState<Issue | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [wardsExpanded, setWardsExpanded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);

  const fetchData = async () => {
    if (!user || !token) return;
    try {
      const [issueRes, wardRes] = await Promise.all([
        fetch(`${ENV.API_BASE_URL}/issues?reportedBy=${user.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${ENV.API_BASE_URL}/wards`),
      ]);
      if (issueRes.ok) { const d = await issueRes.json(); setIssues(d.issues); }
      if (wardRes.ok) { const d = await wardRes.json(); setWards(d.wards || []); }
    } catch (err) { console.error('Fetch error', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, [user]);

  const submitFeedback = async () => {
    if (!feedbackIssue || feedbackRating === 0) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/issues/${feedbackIssue.id}/feedback`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: feedbackRating, text: feedbackText }),
      });
      if (res.ok) { setFeedbackVisible(false); fetchData(); }
    } catch {} finally { setSubmittingFeedback(false); }
  };

  const totalReports = issues.length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const pendingCount = issues.filter(i => i.status === 'pending').length;

  if (!user) {
    return (
      <View style={s.center}><Text style={s.centerText}>Please log in to view your dashboard.</Text>
        <TouchableOpacity style={s.ctaBtn} onPress={() => router.replace('/citizen-login')}><Text style={s.ctaBtnText}>Go to Login</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <ScrollView contentContainerStyle={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#0891b2" />}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>Welcome back,</Text>
              <Text style={s.name}>{user.fullName}</Text>
            </View>
            <TouchableOpacity style={s.logoutBtn} onPress={() => { logout(); router.replace('/'); }}><Text style={s.logoutText}>Logout</Text></TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { borderTopColor: '#0891b2' }]}>
              <Text style={s.statEmoji}>⭐</Text>
              <Text style={[s.statValue, { color: '#0891b2' }]}>{user.points || 0}</Text>
              <Text style={s.statLabel}>Civic Points</Text>
            </View>
            <View style={[s.statCard, { borderTopColor: '#d97706' }]}>
              <Text style={s.statEmoji}>{user.badge === 'gold' ? '🏆' : user.badge === 'silver' ? '🥈' : '🥉'}</Text>
              <Text style={[s.statValue, { color: '#d97706' }]}>{user.badge ? user.badge.charAt(0).toUpperCase() + user.badge.slice(1) : 'Bronze'}</Text>
              <Text style={s.statLabel}>Badge</Text>
            </View>
            <View style={[s.statCard, { borderTopColor: '#059669' }]}>
              <Text style={s.statEmoji}>📊</Text>
              <Text style={[s.statValue, { color: '#059669' }]}>{totalReports}</Text>
              <Text style={s.statLabel}>Reports</Text>
            </View>
            <View style={[s.statCard, { borderTopColor: '#7c3aed' }]}>
              <Text style={s.statEmoji}>✅</Text>
              <Text style={[s.statValue, { color: '#7c3aed' }]}>{resolvedCount}</Text>
              <Text style={s.statLabel}>Resolved</Text>
            </View>
          </View>

          <TouchableOpacity style={s.reportBtn} onPress={() => router.push('/issues')} activeOpacity={0.85}>
            <Text style={s.reportBtnText}>➕ Report New Civic Issue</Text>
          </TouchableOpacity>

          {/* Ward Offices Dropdown */}
          {wards.length > 0 && (
            <View style={s.wardSection}>
              <TouchableOpacity
                style={s.wardDropdownBtn}
                onPress={() => setWardsExpanded(!wardsExpanded)}
                activeOpacity={0.8}
              >
                <Text style={s.wardDropdownTitle}>🏛️ Municipal Ward Offices ({wards.length})</Text>
                <Text style={s.wardDropdownArrow}>{wardsExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {wardsExpanded && (
                <View style={s.wardDropdownList}>
                  {wards.map((w, idx) => (
                    <View key={w.id} style={[s.wardItem, idx < wards.length - 1 && s.wardItemBorder]}>
                      <View style={s.wardItemIcon}>
                        <Text style={{ fontSize: 18 }}>🏛️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.wardItemName}>{w.office_name}</Text>
                        <Text style={s.wardItemMeta}>Ward {w.ward_no} · {w.area_name}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}


          <Text style={s.sectionTitle}>My Reports</Text>
          {loading ? <ActivityIndicator size="large" color="#0891b2" style={{ marginTop: 20 }} /> :
           issues.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
              <Text style={s.emptyTitle}>No reports yet</Text>
              <Text style={s.emptySub}>Help your community by reporting potholes, garbage, and more.</Text>
            </View>
          ) : issues.map(issue => (
            <View key={issue.id} style={s.issueCard}>
              <View style={s.issueHeader}>
                <View style={s.issueTypeBadge}>
                  <Text style={s.issueTypeText}>{typeEmojis[issue.type] || '📋'} {issue.type.toUpperCase()}</Text>
                </View>
                <View style={[s.statusBadge, issue.status === 'resolved' ? s.statusResolved : issue.status === 'in_progress' ? s.statusProgress : s.statusPending]}>
                  <Text style={[s.statusText, issue.status === 'resolved' ? { color: '#059669' } : issue.status === 'in_progress' ? { color: '#0891b2' } : { color: '#d97706' }]}>
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Severity + AI confidence */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={[s.severityBadge, { backgroundColor: (severityColors[issue.severity] || '#64748b') + '15' }]}>
                  <View style={[s.severityDot, { backgroundColor: severityColors[issue.severity] || '#64748b' }]} />
                  <Text style={[s.severityText, { color: severityColors[issue.severity] || '#64748b' }]}>{issue.severity?.toUpperCase()}</Text>
                </View>
                {issue.ai_confidence != null && (
                  <View style={s.aiBadge}>
                    <Text style={s.aiBadgeText}>🤖 AI {Math.round((issue.ai_confidence as number) * 100)}%</Text>
                  </View>
                )}
              </View>

              {issue.image_url && (
                <TouchableOpacity onPress={() => { setLightboxUri(`${ENV.API_BASE_URL.replace('/api', '')}${issue.image_url}`); setLightboxVisible(true); }}>
                  <Image source={{ uri: `${ENV.API_BASE_URL.replace('/api', '')}${issue.image_url}` }} style={s.issueThumb} />
                </TouchableOpacity>
              )}

              <Text style={s.issueDesc}>{issue.description || 'No description provided.'}</Text>

              {/* Ward info */}
              {issue.ward_office_name && (
                <View style={s.wardInfoBadge}>
                  <Text style={s.wardInfoText}>🏛️ {issue.ward_office_name} - Ward {issue.ward_number}</Text>
                </View>
              )}

              {issue.latitude && issue.longitude && Platform.OS === 'web' && (
                <View style={s.mapContainer}>
                  {/* @ts-ignore */}
                  <iframe width="100%" height="120" style={{ border: 0, borderRadius: 8 }} loading="lazy"
                    src={`https://maps.google.com/maps?q=${issue.latitude},${issue.longitude}&z=15&output=embed`} />
                </View>
              )}

              {issue.status === 'resolved' && issue.after_image_url && (
                <View style={s.resolvedBox}>
                  <Text style={s.resolvedLabel}>📸 After Fix:</Text>
                  <TouchableOpacity onPress={() => { setLightboxUri(`${ENV.API_BASE_URL.replace('/api', '')}${issue.after_image_url}`); setLightboxVisible(true); }}>
                    <Image source={{ uri: `${ENV.API_BASE_URL.replace('/api', '')}${issue.after_image_url}` }} style={s.afterThumb} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={s.issueFooter}>
                <Text style={s.issueDate}>{new Date(issue.reported_at).toLocaleDateString()}</Text>
                <Text style={s.issueUpvotes}>⬆ {issue.upvotes}</Text>
              </View>

              {issue.status === 'resolved' && (
                <View style={s.feedbackSection}>
                  {issue.feedback_rating ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={s.feedbackStars}>{'⭐'.repeat(issue.feedback_rating)}{'☆'.repeat(5 - issue.feedback_rating)}</Text>
                      {issue.feedback_text ? <Text style={s.feedbackGivenText}>"{issue.feedback_text}"</Text> : null}
                    </View>
                  ) : (
                    <TouchableOpacity style={s.feedbackBtn} onPress={() => { setFeedbackIssue(issue); setFeedbackRating(0); setFeedbackText(''); setFeedbackVisible(true); }}>
                      <Text style={s.feedbackBtnText}>💬 Rate Resolution</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal visible={feedbackVisible} transparent animationType="slide">
        <View style={s.modalOv}>
          <View style={s.modalC}>
            <Text style={s.modalTitle}>📝 Rate Resolution</Text>
            <Text style={s.modalDesc}>How well was issue #{feedbackIssue?.id} resolved?</Text>
            <View style={s.ratingRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                  <Text style={[s.ratingStar, feedbackRating >= star && s.ratingStarActive]}>{feedbackRating >= star ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.feedbackInput} placeholder="Share your experience (optional)..." placeholderTextColor="#94a3b8" value={feedbackText} onChangeText={setFeedbackText} multiline numberOfLines={3} />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setFeedbackVisible(false)}><Text style={s.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, (feedbackRating === 0 || submittingFeedback) && { opacity: 0.5 }]} onPress={submitFeedback} disabled={feedbackRating === 0 || submittingFeedback}>
                <Text style={s.submitBtnText}>{submittingFeedback ? 'Submitting...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lightbox */}
      <Modal visible={lightboxVisible} transparent animationType="fade">
        <View style={s.lightboxOv}>
          <TouchableOpacity style={s.lightboxClose} onPress={() => setLightboxVisible(false)}><Text style={s.lightboxCloseText}>✕ Close</Text></TouchableOpacity>
          {lightboxUri ? <Image source={{ uri: lightboxUri }} style={s.lightboxImg} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f0f4f8' },
  centerText: { fontSize: 16, color: '#64748b' },
  ctaBtn: { marginTop: 16, backgroundColor: '#0891b2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  ctaBtnText: { color: '#fff', fontWeight: '700' },
  container: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10, marginBottom: 16 },
  greeting: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  logoutBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  logoutText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderTopWidth: 3, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  reportBtn: { backgroundColor: '#0891b2', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20, shadowColor: '#0891b2', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  reportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  wardSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  wardDropdownBtn: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0f2fe', shadowColor: '#0891b2', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  wardDropdownTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  wardDropdownArrow: { fontSize: 14, color: '#0891b2', fontWeight: '700' },
  wardDropdownList: { backgroundColor: '#fff', borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  wardItem: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  wardItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  wardItemIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  wardItemName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  wardItemMeta: { fontSize: 12, color: '#64748b' },
  emptyState: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  issueCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  issueTypeBadge: { backgroundColor: '#f0f4f8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  issueTypeText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusPending: { backgroundColor: '#fef3c7' },
  statusProgress: { backgroundColor: '#e0f2fe' },
  statusResolved: { backgroundColor: '#d1fae5' },
  statusText: { fontSize: 11, fontWeight: '800' },
  severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 5 },
  severityDot: { width: 7, height: 7, borderRadius: 4 },
  severityText: { fontSize: 10, fontWeight: '800' },
  aiBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#7c3aed' },
  issueThumb: { width: '100%', height: 120, borderRadius: 12, marginBottom: 8 },
  issueDesc: { fontSize: 14, color: '#475569', marginBottom: 8, lineHeight: 20 },
  wardInfoBadge: { backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  wardInfoText: { fontSize: 11, color: '#0891b2', fontWeight: '700' },
  mapContainer: { width: '100%', height: 120, marginBottom: 8, borderRadius: 8, overflow: 'hidden' },
  resolvedBox: { backgroundColor: '#d1fae5', borderRadius: 12, padding: 10, marginBottom: 8 },
  resolvedLabel: { fontSize: 12, fontWeight: '700', color: '#059669', marginBottom: 6 },
  afterThumb: { width: '100%', height: 80, borderRadius: 8 },
  issueFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  issueDate: { fontSize: 12, color: '#94a3b8' },
  issueUpvotes: { fontSize: 12, color: '#0891b2', fontWeight: '700' },
  feedbackSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  feedbackStars: { fontSize: 18, letterSpacing: 2 },
  feedbackGivenText: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
  feedbackBtn: { backgroundColor: '#fef3c7', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  feedbackBtnText: { color: '#d97706', fontWeight: '700', fontSize: 13 },
  modalOv: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalC: { backgroundColor: '#fff', width: '100%', maxWidth: 400, borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  modalDesc: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  ratingStar: { fontSize: 36, color: '#cbd5e1' },
  ratingStarActive: { color: '#f59e0b' },
  feedbackInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: 'top', height: 80, marginBottom: 20, color: '#0f172a' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: '700' },
  submitBtn: { flex: 1, backgroundColor: '#0891b2', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  lightboxOv: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  lightboxCloseText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  lightboxImg: { width: '90%', height: '70%', borderRadius: 8 },
});
