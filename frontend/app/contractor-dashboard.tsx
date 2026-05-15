import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, TextInput, Platform, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';
import Footer from '../components/Footer';

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};
const sevColors: Record<string, string> = { low: '#4a7c59', medium: '#c9a227', high: '#b8393b' };

export default function ContractorDashboard() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState('available');
  const [issues, setIssues] = useState<any[]>([]);
  const [myIssues, setMyIssues] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bidModal, setBidModal] = useState({ visible: false, issueId: 0, type: '' });
  const [bidAmount, setBidAmount] = useState('');
  const [bidNote, setBidNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [popup, setPopup] = useState({ visible: false, title: '', msg: '', ok: false });
  const popupScale = useRef(new Animated.Value(0)).current;
  const showPopup = (t: string, m: string, ok = false) => { setPopup({ visible: true, title: t, msg: m, ok }); Animated.spring(popupScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start(); };
  const hidePopup = () => { Animated.timing(popupScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setPopup(p => ({ ...p, visible: false }))); };

  const fetchData = async () => {
    if (!token) return;
    try {
      const [avRes, myRes] = await Promise.all([
        fetch(`${ENV.API_BASE_URL}/contractors/available-issues`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${ENV.API_BASE_URL}/contractors/my-issues`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (avRes.ok) { const d = await avRes.json(); setIssues(d.issues || []); setMyBids(d.myBids || {}); }
      if (myRes.ok) { const d = await myRes.json(); setMyIssues(d.issues || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, [user]);

  const submitBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) { showPopup('Invalid', 'Enter a valid amount.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/contractors/bid/${bidModal.issueId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(bidAmount), note: bidNote })
      });
      if (res.ok) { showPopup('Bid Submitted', `Your bid of ₹${bidAmount} has been submitted.`, true); setBidModal({ visible: false, issueId: 0, type: '' }); setBidAmount(''); setBidNote(''); fetchData(); }
      else { const d = await res.json(); showPopup('Error', d.error || 'Failed.'); }
    } catch { showPopup('Error', 'Connection failed.'); }
    finally { setSubmitting(false); }
  };

  if (!user || user.role !== 'contractor') {
    return (<View style={s.center}><Text style={s.centerText}>Contractor authentication required.</Text>
      <TouchableOpacity style={s.ctaBtn} onPress={() => router.replace('/contractor-login')}><Text style={{ color: '#fff', fontWeight: '700' }}>Sign In</Text></TouchableOpacity></View>);
  }

  const displayed = tab === 'available' ? issues : myIssues;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#4a7c59" />}>
        <Animated.View>
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>CONTRACTOR PORTAL</Text>
              <Text style={s.name}>{user.fullName}</Text>
              <Text style={s.meta}>ID: {user.id} · Jobs: {(user as any).jobsCompleted || 0} · Rating: {(user as any).rating ? `${(user as any).rating}/5` : 'N/A'}</Text>
            </View>
            <TouchableOpacity style={s.logoutBtn} onPress={() => { logout(); router.replace('/'); }}><Text style={s.logoutText}>Sign Out</Text></TouchableOpacity>
          </View>

          <View style={s.statsRow}>
            {[
              { val: issues.length, label: 'Available', color: '#c9a227' },
              { val: Object.keys(myBids).length, label: 'My Bids', color: '#8b6914' },
              { val: myIssues.length, label: 'Assigned', color: '#4a7c59' },
              { val: myIssues.filter(i => i.status === 'resolved').length, label: 'Completed', color: '#1e1e2e' },
            ].map((st, i) => (
              <View key={i} style={[s.statCard, glass]}>
                <Text style={[s.statValue, { color: st.color }]}>{st.val}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.tabRow}>
            {['available', 'assigned'].map(t => (
              <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabActive]} onPress={() => setTab(t)}>
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'available' ? 'Available Issues' : 'My Assignments'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? <ActivityIndicator size="large" color="#4a7c59" style={{ marginTop: 30 }} /> :
           displayed.length === 0 ? (
            <View style={[s.emptyCard, glass]}><Text style={s.emptyTitle}>No issues found</Text><Text style={s.emptySub}>{tab === 'available' ? 'All current issues have been assigned.' : 'No assignments yet. Submit bids to get started.'}</Text></View>
          ) : (
            <View style={s.grid}>
              {displayed.map(issue => {
                const bid = myBids[issue.id];
                return (
                  <View key={issue.id} style={[s.issueCard, glass]}>
                    <View style={s.cardTop}>
                      <Text style={s.cardId}>#{issue.id}</Text>
                      <View style={[s.sevBadge, { backgroundColor: (sevColors[issue.severity] || '#8b7e6a') + '15' }]}>
                        <View style={[s.sevDot, { backgroundColor: sevColors[issue.severity] || '#8b7e6a' }]} />
                        <Text style={[s.sevText, { color: sevColors[issue.severity] }]}>{issue.severity?.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={s.typeBadge}><Text style={s.typeText}>{issue.type?.toUpperCase()}</Text></View>
                    <Text style={s.cardDesc} numberOfLines={2}>{issue.description || 'No description'}</Text>
                    {issue.ward_office_name && <Text style={s.wardText}>{issue.ward_office_name} · Ward {issue.ward_number}</Text>}
                    <View style={s.statusRow}>
                      <View style={[s.statusBadge, issue.status === 'resolved' ? { backgroundColor: 'rgba(74,124,89,0.12)' } : issue.status === 'in_progress' ? { backgroundColor: 'rgba(139,105,20,0.12)' } : { backgroundColor: 'rgba(201,162,39,0.12)' }]}>
                        <Text style={s.statusText}>{issue.status?.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                      {issue.budget_amount && <Text style={s.budgetText}>₹{parseFloat(issue.budget_amount).toLocaleString()}</Text>}
                    </View>

                    {tab === 'available' && (
                      bid ? (
                        <View style={s.bidInfo}><Text style={s.bidLabel}>Your Bid: ₹{parseFloat(bid.amount).toLocaleString()}</Text><Text style={[s.bidStatus, bid.status === 'accepted' && { color: '#4a7c59' }]}>{bid.status.toUpperCase()}</Text></View>
                      ) : (
                        <TouchableOpacity style={s.bidBtn} onPress={() => { setBidModal({ visible: true, issueId: issue.id, type: issue.type }); setBidAmount(''); setBidNote(''); }}>
                          <Text style={s.bidBtnText}>Submit Bid</Text>
                        </TouchableOpacity>
                      )
                    )}
                    {tab === 'assigned' && issue.status !== 'resolved' && (
                      <View style={s.assignedInfo}><Text style={s.assignedLabel}>Assigned to you · In Progress</Text></View>
                    )}
                    {tab === 'assigned' && issue.status === 'resolved' && (
                      <View style={[s.assignedInfo, { backgroundColor: 'rgba(74,124,89,0.08)' }]}><Text style={[s.assignedLabel, { color: '#4a7c59' }]}>Completed</Text></View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
        <Footer />
      </ScrollView>

      {/* Bid Modal */}
      <Modal visible={bidModal.visible} transparent animationType="slide">
        <View style={s.modalOv}><View style={[s.modalC, glass]}>
          <Text style={s.modalTitle}>Submit Bid</Text>
          <Text style={s.modalDesc}>Issue #{bidModal.issueId} — {bidModal.type}</Text>
          <Text style={s.fieldLabel}>Your Quote (₹)</Text>
          <TextInput style={s.modalInput} placeholder="Enter amount" placeholderTextColor="#b0a898" keyboardType="numeric" value={bidAmount} onChangeText={setBidAmount} />
          <Text style={s.fieldLabel}>Note (optional)</Text>
          <TextInput style={[s.modalInput, { height: 70, textAlignVertical: 'top' }]} placeholder="Timeline, materials..." placeholderTextColor="#b0a898" value={bidNote} onChangeText={setBidNote} multiline />
          <View style={s.modalActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setBidModal({ visible: false, issueId: 0, type: '' })}><Text style={{ color: '#6b6352', fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.submitBidBtn, submitting && { opacity: 0.5 }]} onPress={submitBid} disabled={submitting}><Text style={{ color: '#fff', fontWeight: '700' }}>{submitting ? 'Submitting...' : 'Submit Bid'}</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      <Modal visible={popup.visible} transparent animationType="none" onRequestClose={hidePopup}>
        <View style={s.modalOv}><Animated.View style={[s.popupC, glass, { transform: [{ scale: popupScale }] }]}>
          <Text style={s.popupT}>{popup.title}</Text><Text style={s.popupM}>{popup.msg}</Text>
          <TouchableOpacity style={[s.popupBtn, popup.ok && { backgroundColor: '#4a7c59' }]} onPress={hidePopup}><Text style={{ color: '#fff', fontWeight: '700' }}>OK</Text></TouchableOpacity>
        </Animated.View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  centerText: { fontSize: 15, color: '#6b6352' },
  ctaBtn: { marginTop: 16, backgroundColor: '#4a7c59', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  container: { flexGrow: 1, padding: 24, paddingBottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 11, color: '#4a7c59', fontWeight: '700', letterSpacing: 1.5 },
  name: { fontSize: 22, fontWeight: '800', color: '#1e1e2e', marginTop: 4 },
  meta: { fontSize: 12, color: '#8b7e6a', marginTop: 4 },
  logoutBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,180,140,0.3)' },
  logoutText: { color: '#8b7e6a', fontWeight: '600', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 9, color: '#8b7e6a', fontWeight: '700', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)', alignItems: 'center' },
  tabActive: { backgroundColor: '#1e1e2e', borderColor: '#1e1e2e' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#8b7e6a' },
  tabTextActive: { color: '#fff' },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e2e', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#8b7e6a', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  issueCard: { width: '31%', minWidth: 220, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardId: { fontSize: 13, fontWeight: '800', color: '#1e1e2e' },
  sevBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
  sevDot: { width: 5, height: 5, borderRadius: 3 },
  sevText: { fontSize: 9, fontWeight: '700' },
  typeBadge: { backgroundColor: 'rgba(30,30,46,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
  typeText: { fontSize: 10, fontWeight: '700', color: '#1e1e2e', letterSpacing: 0.3 },
  cardDesc: { fontSize: 12, color: '#6b6352', lineHeight: 18, marginBottom: 6 },
  wardText: { fontSize: 11, color: '#8b7e6a', marginBottom: 6 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '700', color: '#1e1e2e' },
  budgetText: { fontSize: 13, fontWeight: '800', color: '#4a7c59' },
  bidBtn: { backgroundColor: '#4a7c59', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  bidBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  bidInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(201,162,39,0.08)', padding: 8, borderRadius: 8 },
  bidLabel: { fontSize: 11, color: '#8b6914', fontWeight: '700' },
  bidStatus: { fontSize: 10, fontWeight: '800', color: '#c9a227' },
  assignedInfo: { backgroundColor: 'rgba(30,30,46,0.05)', padding: 8, borderRadius: 8, alignItems: 'center' },
  assignedLabel: { fontSize: 11, fontWeight: '700', color: '#1e1e2e' },
  modalOv: { flex: 1, backgroundColor: 'rgba(30,30,46,0.3)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalC: { backgroundColor: 'rgba(255,255,255,0.92)', width: '100%', maxWidth: 420, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 4 },
  modalDesc: { fontSize: 13, color: '#8b7e6a', marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#1e1e2e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { height: 46, borderWidth: 1, borderColor: 'rgba(200,180,140,0.3)', borderRadius: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.6)', fontSize: 14, color: '#1e1e2e', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: 'rgba(200,180,140,0.15)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBidBtn: { flex: 1, backgroundColor: '#4a7c59', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  popupC: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  popupT: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 10 },
  popupM: { fontSize: 14, color: '#6b6352', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  popupBtn: { backgroundColor: '#1e1e2e', paddingVertical: 12, paddingHorizontal: 36, borderRadius: 12 },
});
