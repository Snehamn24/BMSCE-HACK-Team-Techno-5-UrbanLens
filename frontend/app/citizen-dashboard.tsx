import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image, Platform, Modal, TextInput, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';
import Footer from '../components/Footer';

type Issue = { id: number; type: string; status: string; severity: string; description: string; image_url: string; after_image_url: string; latitude: number; longitude: number; reported_at: string; resolved_at: string; upvotes: number; feedback_rating: number | null; feedback_text: string | null; ward_office_name?: string; ward_number?: string; ward_area?: string; ai_confidence?: number; ai_detected_type?: string; assigned_contractor?: string; contractor_feedback_rating?: number | null; };
type Ward = { id: number; office_name: string; ward_no: string; area_name: string; };

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};
const sevColors: Record<string, string> = { low: '#4a7c59', medium: '#c9a227', high: '#b8393b' };

export default function CitizenDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wardsExpanded, setWardsExpanded] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxUri, setLightboxUri] = useState('');
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackIssue, setFeedbackIssue] = useState<Issue | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [ctrRatingModal, setCtrRatingModal] = useState({ visible: false, issueId: 0, contractorId: '' });
  const [ctrRating, setCtrRating] = useState(0);
  const [ctrRatingLoading, setCtrRatingLoading] = useState(false);
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
      const res = await fetch(`${ENV.API_BASE_URL}/issues/${feedbackIssue.id}/feedback`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ rating: feedbackRating, text: feedbackText }) });
      if (res.ok) { setFeedbackVisible(false); fetchData(); }
    } catch {} finally { setSubmittingFeedback(false); }
  };

  const submitContractorRating = async () => {
    if (ctrRating === 0) return;
    setCtrRatingLoading(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/contractors/rate/${ctrRatingModal.issueId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ rating: ctrRating }) });
      if (res.ok) { setCtrRatingModal({ visible: false, issueId: 0, contractorId: '' }); fetchData(); }
    } catch {} finally { setCtrRatingLoading(false); }
  };

  const totalReports = issues.length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const pendingCount = issues.filter(i => i.status === 'pending').length;

  if (!user) {
    return (<View style={s.center}><Text style={s.centerText}>Please sign in to view your dashboard.</Text>
      <TouchableOpacity style={s.ctaBtn} onPress={() => router.replace('/citizen-login')}><Text style={s.ctaBtnText}>Sign In</Text></TouchableOpacity></View>);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#c9a227" />}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>Welcome back,</Text>
              <Text style={s.name}>{user.fullName}</Text>
            </View>
            <TouchableOpacity style={s.logoutBtn} onPress={() => { logout(); router.replace('/'); }}><Text style={s.logoutText}>Sign Out</Text></TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { val: user.points || 0, label: 'Civic Points', color: '#c9a227' },
              { val: user.badge ? user.badge.charAt(0).toUpperCase() + user.badge.slice(1) : 'Bronze', label: 'Badge', color: '#8b6914' },
              { val: totalReports, label: 'Reports', color: '#1e1e2e' },
              { val: resolvedCount, label: 'Resolved', color: '#4a7c59' },
            ].map((st, i) => (
              <View key={i} style={[s.statCard, glass]}>
                <Text style={[s.statValue, { color: st.color }]}>{st.val}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.reportBtn} onPress={() => router.push('/issues')} activeOpacity={0.85}>
            <Text style={s.reportBtnText}>Report New Issue</Text>
          </TouchableOpacity>

          {/* Ward Dropdown */}
          {wards.length > 0 && (
            <View style={s.wardSection}>
              <TouchableOpacity style={[s.wardDropdownBtn, glass]} onPress={() => setWardsExpanded(!wardsExpanded)} activeOpacity={0.8}>
                <Text style={s.wardDropdownTitle}>Municipal Ward Offices ({wards.length})</Text>
                <Text style={s.wardArrow}>{wardsExpanded ? '−' : '+'}</Text>
              </TouchableOpacity>
              {wardsExpanded && (
                <View style={[s.wardList, glass]}>
                  {wards.map((w, idx) => (
                    <View key={w.id} style={[s.wardItem, idx < wards.length - 1 && s.wardItemBorder]}>
                      <View style={s.wardDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.wardName}>{w.office_name}</Text>
                        <Text style={s.wardMeta}>Ward {w.ward_no} · {w.area_name}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={s.sectionTitle}>My Reports</Text>
          {loading ? <ActivityIndicator size="large" color="#c9a227" style={{ marginTop: 20 }} /> :
           issues.length === 0 ? (
            <View style={[s.emptyState, glass]}>
              <Text style={s.emptyTitle}>No reports filed yet</Text>
              <Text style={s.emptySub}>Help your community by reporting infrastructure issues.</Text>
            </View>
          ) : issues.map(issue => (
            <View key={issue.id} style={[s.issueCard, glass]}>
              <View style={s.issueHeader}>
                <View style={s.typeBadge}><Text style={s.typeText}>{issue.type.toUpperCase()}</Text></View>
                <View style={[s.statusBadge, issue.status === 'resolved' ? s.statusResolved : issue.status === 'in_progress' ? s.statusProgress : s.statusPending]}>
                  <Text style={s.statusText}>{issue.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
                {issue.upvotes > 1 && (
                  <View style={{ backgroundColor: issue.upvotes >= 5 ? 'rgba(184,57,59,0.12)' : 'rgba(201,162,39,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: issue.upvotes >= 5 ? '#b8393b' : '#c9a227' }}>🔥 {issue.upvotes} reports</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={[s.sevBadge, { backgroundColor: (sevColors[issue.severity] || '#8b7e6a') + '15' }]}>
                  <View style={[s.sevDot, { backgroundColor: sevColors[issue.severity] || '#8b7e6a' }]} />
                  <Text style={[s.sevText, { color: sevColors[issue.severity] || '#8b7e6a' }]}>{issue.severity?.toUpperCase()}</Text>
                </View>
                {issue.ai_confidence != null && (
                  <View style={s.aiBadge}><Text style={s.aiBadgeText}>AI {Math.round((issue.ai_confidence as number) * 100)}%</Text></View>
                )}
              </View>

              {issue.image_url && (
                <TouchableOpacity onPress={() => { setLightboxUri(`${ENV.API_BASE_URL.replace('/api', '')}${issue.image_url}`); setLightboxVisible(true); }} activeOpacity={0.85}>
                  <Image source={{ uri: `${ENV.API_BASE_URL.replace('/api', '')}${issue.image_url}` }} style={s.issueThumb} resizeMode="cover" />
                  <Text style={{ fontSize: 10, color: '#b0a898', textAlign: 'center', marginBottom: 6 }}>Tap to enlarge</Text>
                </TouchableOpacity>
              )}
              <Text style={s.issueDesc}>{issue.description || 'No description provided.'}</Text>
              {issue.ward_office_name && <View style={s.wardBadge}><Text style={s.wardBadgeText}>{issue.ward_office_name} — Ward {issue.ward_number}</Text></View>}

              {issue.latitude && issue.longitude && Platform.OS === 'web' && (
                <View style={s.mapContainer}>
                  {/* @ts-ignore */}
                  <iframe width="100%" height="100" style={{ border: 0, borderRadius: 8 }} loading="lazy"
                    src={`https://maps.google.com/maps?q=${issue.latitude},${issue.longitude}&z=15&output=embed`} />
                </View>
              )}

              {issue.status === 'resolved' && issue.after_image_url && (
                <View style={s.resolvedBox}>
                  <Text style={s.resolvedLabel}>✅ After Fix</Text>
                  <TouchableOpacity onPress={() => { setLightboxUri(`${ENV.API_BASE_URL.replace('/api', '')}${issue.after_image_url}`); setLightboxVisible(true); }}>
                    <Image source={{ uri: `${ENV.API_BASE_URL.replace('/api', '')}${issue.after_image_url}` }} style={s.afterThumb} resizeMode="cover" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={s.issueFooter}>
                <Text style={s.issueDate}>{new Date(issue.reported_at).toLocaleDateString()}</Text>
                <Text style={s.issueUpvotes}>{issue.upvotes} upvotes</Text>
              </View>

              {issue.status === 'resolved' && (
                <View style={s.feedbackSection}>
                  {issue.feedback_rating ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#8b7e6a', marginBottom: 4 }}>Service Rating</Text>
                      <Text style={s.feedbackStars}>{'★'.repeat(issue.feedback_rating)}{'☆'.repeat(5 - issue.feedback_rating)}</Text>
                      {issue.feedback_text ? <Text style={s.feedbackGiven}>"{issue.feedback_text}"</Text> : null}
                    </View>
                  ) : (
                    <TouchableOpacity style={s.feedbackBtn} onPress={() => { setFeedbackIssue(issue); setFeedbackRating(0); setFeedbackText(''); setFeedbackVisible(true); }}>
                      <Text style={s.feedbackBtnText}>⭐ Rate Resolution</Text>
                    </TouchableOpacity>
                  )}
                  {issue.assigned_contractor && (
                    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(200,180,140,0.15)', paddingTop: 8 }}>
                      <Text style={{ fontSize: 11, color: '#8b7e6a', marginBottom: 4 }}>Contractor: {issue.assigned_contractor}</Text>
                      {issue.contractor_feedback_rating ? (
                        <Text style={s.feedbackStars}>{'★'.repeat(issue.contractor_feedback_rating)}{'☆'.repeat(5 - issue.contractor_feedback_rating)}</Text>
                      ) : (
                        <TouchableOpacity style={[s.feedbackBtn, { backgroundColor: 'rgba(74,124,89,0.12)' }]} onPress={() => { setCtrRatingModal({ visible: true, issueId: issue.id, contractorId: issue.assigned_contractor || '' }); setCtrRating(0); }}>
                          <Text style={[s.feedbackBtnText, { color: '#4a7c59' }]}>⭐ Rate Contractor</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </Animated.View>
        <Footer />
      </ScrollView>

      {/* Feedback Modal */}
      <Modal visible={feedbackVisible} transparent animationType="slide">
        <View style={s.modalOv}><View style={[s.modalC, glass]}>
          <Text style={s.modalTitle}>Rate Resolution</Text>
          <Text style={s.modalDesc}>How well was issue #{feedbackIssue?.id} resolved?</Text>
          <View style={s.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                <Text style={[s.ratingStar, feedbackRating >= star && s.ratingStarActive]}>{feedbackRating >= star ? '★' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={s.feedbackInput} placeholder="Share your experience (optional)..." placeholderTextColor="#b0a898" value={feedbackText} onChangeText={setFeedbackText} multiline numberOfLines={3} />
          <View style={s.modalActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setFeedbackVisible(false)}><Text style={{ color: '#6b6352', fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.submitBtn, (feedbackRating === 0 || submittingFeedback) && { opacity: 0.5 }]} onPress={submitFeedback} disabled={feedbackRating === 0 || submittingFeedback}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{submittingFeedback ? 'Submitting...' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Contractor Rating Modal */}
      <Modal visible={ctrRatingModal.visible} transparent animationType="slide">
        <View style={s.modalOv}><View style={[s.modalC, glass]}>
          <Text style={s.modalTitle}>Rate Contractor</Text>
          <Text style={s.modalDesc}>How was contractor {ctrRatingModal.contractorId}'s work?</Text>
          <View style={s.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setCtrRating(star)}>
                <Text style={[s.ratingStar, ctrRating >= star && s.ratingStarActive]}>{ctrRating >= star ? '★' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.modalActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setCtrRatingModal({ visible: false, issueId: 0, contractorId: '' })}><Text style={{ color: '#6b6352', fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.submitBtn, (ctrRating === 0 || ctrRatingLoading) && { opacity: 0.5 }]} onPress={submitContractorRating} disabled={ctrRating === 0 || ctrRatingLoading}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{ctrRatingLoading ? 'Submitting...' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Lightbox */}
      <Modal visible={lightboxVisible} transparent animationType="fade">
        <View style={s.lightboxOv}>
          <TouchableOpacity style={s.lightboxClose} onPress={() => setLightboxVisible(false)}><Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text></TouchableOpacity>
          {lightboxUri ? <Image source={{ uri: lightboxUri }} style={s.lightboxImg} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  centerText: { fontSize: 15, color: '#6b6352' },
  ctaBtn: { marginTop: 16, backgroundColor: '#1e1e2e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  ctaBtnText: { color: '#fff', fontWeight: '700' },
  container: { flexGrow: 1, padding: 24, paddingBottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 13, color: '#8b7e6a', fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: '#1e1e2e', marginTop: 2 },
  logoutBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,180,140,0.3)' },
  logoutText: { color: '#8b7e6a', fontWeight: '600', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#8b7e6a', fontWeight: '600', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  reportBtn: { backgroundColor: '#1e1e2e', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 20 },
  reportBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  wardSection: { marginBottom: 20 },
  wardDropdownBtn: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  wardDropdownTitle: { fontSize: 14, fontWeight: '700', color: '#1e1e2e' },
  wardArrow: { fontSize: 18, color: '#8b7e6a', fontWeight: '300' },
  wardList: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)', overflow: 'hidden' },
  wardItem: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  wardItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(200,180,140,0.15)' },
  wardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c9a227', marginRight: 12 },
  wardName: { fontSize: 14, fontWeight: '700', color: '#1e1e2e', marginBottom: 2 },
  wardMeta: { fontSize: 12, color: '#8b7e6a' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 14 },
  emptyState: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e2e', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#8b7e6a', textAlign: 'center', lineHeight: 20 },
  issueCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { backgroundColor: 'rgba(30,30,46,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 11, fontWeight: '800', color: '#1e1e2e', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPending: { backgroundColor: 'rgba(201,162,39,0.12)' },
  statusProgress: { backgroundColor: 'rgba(30,30,46,0.08)' },
  statusResolved: { backgroundColor: 'rgba(74,124,89,0.12)' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#1e1e2e' },
  sevBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 5 },
  sevDot: { width: 6, height: 6, borderRadius: 3 },
  sevText: { fontSize: 10, fontWeight: '700' },
  aiBadge: { backgroundColor: 'rgba(201,162,39,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  aiBadgeText: { fontSize: 10, fontWeight: '700', color: '#8b6914' },
  issueThumb: { width: '100%', height: 180, borderRadius: 14, marginBottom: 4, backgroundColor: '#e8e2d8' },
  issueDesc: { fontSize: 14, color: '#6b6352', marginBottom: 8, lineHeight: 20 },
  wardBadge: { backgroundColor: 'rgba(30,30,46,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  wardBadgeText: { fontSize: 11, color: '#1e1e2e', fontWeight: '600' },
  mapContainer: { width: '100%', maxWidth: 320, height: 100, marginBottom: 10, borderRadius: 8, overflow: 'hidden' },
  resolvedBox: { backgroundColor: 'rgba(74,124,89,0.08)', borderRadius: 12, padding: 10, marginBottom: 8 },
  resolvedLabel: { fontSize: 11, fontWeight: '700', color: '#4a7c59', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  afterThumb: { width: '100%', height: 140, borderRadius: 10, backgroundColor: '#e8e2d8' },
  issueFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  issueDate: { fontSize: 12, color: '#b0a898' },
  issueUpvotes: { fontSize: 12, color: '#c9a227', fontWeight: '600' },
  feedbackSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(200,180,140,0.15)', paddingTop: 10 },
  feedbackStars: { fontSize: 20, color: '#c9a227', letterSpacing: 2 },
  feedbackGiven: { fontSize: 12, color: '#8b7e6a', fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
  feedbackBtn: { backgroundColor: 'rgba(201,162,39,0.12)', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  feedbackBtnText: { color: '#8b6914', fontWeight: '700', fontSize: 13 },
  modalOv: { flex: 1, backgroundColor: 'rgba(30,30,46,0.3)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalC: { backgroundColor: 'rgba(255,255,255,0.9)', width: '100%', maxWidth: 400, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 6 },
  modalDesc: { fontSize: 13, color: '#8b7e6a', marginBottom: 20 },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  ratingStar: { fontSize: 32, color: '#d4cdc0' },
  ratingStarActive: { color: '#c9a227' },
  feedbackInput: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(200,180,140,0.3)', borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: 'top', height: 80, marginBottom: 20, color: '#1e1e2e' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: 'rgba(200,180,140,0.15)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtn: { flex: 1, backgroundColor: '#1e1e2e', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  lightboxOv: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  lightboxImg: { width: '90%', height: '70%', borderRadius: 8 },
});
