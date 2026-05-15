import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, TextInput, Platform, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

const issueTypes = [
  { id: 'pothole', emoji: '🕳️', label: 'Pothole', color: '#0891b2', description: 'Damaged road surface' },
  { id: 'garbage', emoji: '🗑️', label: 'Garbage Dump', color: '#059669', description: 'Illegal dumping / trash' },
  { id: 'streetlight', emoji: '💡', label: 'Broken Streetlight', color: '#d97706', description: 'Non-functional light' },
  { id: 'drainage', emoji: '💧', label: 'Blocked Drain', color: '#7c3aed', description: 'Clogged drainage' },
  { id: 'tree', emoji: '🌳', label: 'Fallen Tree', color: '#b45309', description: 'Blocking road/path' },
];

function getLeafletMapHTML(lat: string, lng: string) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style></head><body><div id="map"></div><script>
var lat=${lat||12.9716},lng=${lng||77.5946};var map=L.map('map').setView([lat,lng],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'OSM'}).addTo(map);
var marker=L.marker([lat,lng],{draggable:true}).addTo(map);
marker.on('dragend',function(e){var p=marker.getLatLng();window.parent.postMessage(JSON.stringify({lat:p.lat,lng:p.lng}),'*');});
map.on('click',function(e){marker.setLatLng(e.latlng);window.parent.postMessage(JSON.stringify({lat:e.latlng.lat,lng:e.latlng.lng}),'*');});
</script></body></html>`;
}

type Ward = { id: number; office_name: string; ward_no: string; area_name: string; };

export default function IssuesScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationText, setLocationText] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingAI, setValidatingAI] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [wardPickerVisible, setWardPickerVisible] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupSuccess, setPopupSuccess] = useState(false);
  const popupScale = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showPopup = (t: string, m: string, s = false) => {
    setPopupTitle(t); setPopupMessage(m); setPopupSuccess(s); setPopupVisible(true);
    Animated.spring(popupScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  };
  const hidePopup = () => {
    Animated.timing(popupScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setPopupVisible(false);
      if (popupSuccess) router.replace('/citizen-dashboard');
    });
  };

  useEffect(() => {
    fetch(`${ENV.API_BASE_URL}/wards`).then(r => r.json()).then(d => setWards(d.wards || [])).catch(() => {});
  }, []);

  const reverseGeocode = async (lat: string, lng: string) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data.display_name) setLocationText(data.display_name.substring(0, 120));
    } catch {}
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.lat && data.lng) {
            const nLat = data.lat.toFixed(6); const nLng = data.lng.toFixed(6);
            setLatitude(nLat); setLongitude(nLng); reverseGeocode(nLat, nLng);
          }
        } catch {}
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  }, []);

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, [step]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return showPopup('Permission Denied', 'Camera roll permissions needed!');
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return showPopup('Permission Denied', 'Camera permissions needed!');
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const getLiveLocation = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { showPopup('Location Denied', 'Permission denied'); return; }
      let loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude.toString());
      setLongitude(loc.coords.longitude.toString());
      reverseGeocode(loc.coords.latitude.toString(), loc.coords.longitude.toString());
    } catch { showPopup('Location Error', 'Could not get location.'); }
    finally { setGettingLocation(false); }
  };

  const handleSubmit = async () => {
    if (!latitude.trim() || !longitude.trim()) return showPopup('Missing Location', 'Please provide coordinates.');
    if (!imageUri) return showPopup('Missing Image', 'Please capture or select an image.');
    if (!selectedWardId) return showPopup('Missing Ward', 'Please select a ward office.');
    setValidatingAI(true);
    await new Promise(r => setTimeout(r, 1500));
    setValidatingAI(false);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', selectedType!);
      formData.append('severity', 'medium');
      formData.append('description', description || locationText);
      formData.append('latitude', latitude.trim());
      formData.append('longitude', longitude.trim());
      formData.append('wardId', String(selectedWardId));
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      // @ts-ignore
      formData.append('image', { uri: imageUri, name: filename, type });
      const res = await fetch(`${ENV.API_BASE_URL}/issues`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok) { showPopup('Error ❌', data.error || 'Failed to submit'); }
      else {
        setAiResult(data.aiAnalysis || null);
        const msg = data.duplicate
          ? `Similar issue nearby — merged! +${data.pointsEarned} pts`
          : `Reported! +${data.pointsEarned} pts${data.aiAnalysis?.ai_powered ? '\n🤖 AI detected: ' + data.aiAnalysis.type + ' (' + Math.round(data.aiAnalysis.confidence * 100) + '% confidence)' : ''}`;
        showPopup('Success 🎉', msg, true);
      }
    } catch { showPopup('Network Error', 'Cannot connect to server.'); }
    finally { setLoading(false); }
  };

  if (!token || user?.role !== 'citizen') {
    return (<View style={st.center}><Text style={{ color: '#64748b' }}>You must be logged in as a Citizen.</Text>
      <TouchableOpacity style={st.ctaBtn} onPress={() => router.replace('/citizen-login')}><Text style={st.ctaBtnText}>Login</Text></TouchableOpacity></View>);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={st.container}>
        <View style={st.header}>
          <Text style={st.title}>📍 Civic Tracker</Text>
          <View style={st.stepIndicator}>
            {[1, 2, 3].map(s => (<View key={s} style={[st.stepDot, step >= s && st.stepDotActive]} />))}
          </View>
          <Text style={st.subtitle}>Step {step} of 3</Text>
        </View>

        {step === 1 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={st.instruction}>What kind of issue?</Text>
            {issueTypes.map(issue => (
              <TouchableOpacity key={issue.id} style={[st.card, selectedType === issue.id && { borderColor: issue.color, borderWidth: 2 }]}
                onPress={() => { setSelectedType(issue.id); setStep(2); }} activeOpacity={0.8}>
                <View style={[st.emojiBox, { backgroundColor: issue.color + '15' }]}><Text style={st.cardEmoji}>{issue.emoji}</Text></View>
                <View style={st.cardTextBlock}>
                  <Text style={[st.cardTitle, { color: issue.color }]}>{issue.label}</Text>
                  <Text style={st.cardDesc}>{issue.description}</Text>
                </View>
                <Text style={{ fontSize: 18, color: issue.color }}>→</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={st.instruction}>📸 Photo & 📍 Location</Text>
            <View style={st.section}>
              {imageUri ? <Image source={{ uri: imageUri }} style={st.previewImg} /> : (
                <View style={st.placeholder}><Text style={{ fontSize: 36, marginBottom: 8 }}>📷</Text><Text style={st.placeholderText}>No image selected</Text></View>
              )}
              <View style={st.btnRow}>
                <TouchableOpacity style={st.secBtn} onPress={takePhoto}><Text style={st.secBtnText}>📸 Take Photo</Text></TouchableOpacity>
                <View style={{ width: 10 }} />
                <TouchableOpacity style={st.secBtn} onPress={pickImage}><Text style={st.secBtnText}>📁 Upload</Text></TouchableOpacity>
              </View>
            </View>
            <View style={st.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={st.label}>Location Details</Text>
                <TouchableOpacity style={st.liveLocBtn} onPress={getLiveLocation} disabled={gettingLocation}>
                  {gettingLocation ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.liveLocText}>📍 Live Location</Text>}
                </TouchableOpacity>
              </View>
              <View style={st.coordRow}>
                <TextInput style={[st.input, { flex: 1 }]} placeholder="Lat: 12.9716" placeholderTextColor="#94a3b8" value={latitude} onChangeText={setLatitude} keyboardType="numeric" />
                <View style={{ width: 10 }} />
                <TextInput style={[st.input, { flex: 1 }]} placeholder="Lng: 77.5946" placeholderTextColor="#94a3b8" value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
              </View>
              {latitude && longitude && Platform.OS === 'web' && (
                <View style={st.mapWrap}>
                  <Text style={st.mapHint}>📌 Drag pin or click to set location</Text>
                  {/* @ts-ignore */}
                  <iframe srcDoc={getLeafletMapHTML(latitude, longitude)} width="100%" height="220" style={{ border: 0, borderRadius: 8 }} />
                </View>
              )}
              <Text style={[st.label, { marginTop: 10 }]}>Address/Landmark</Text>
              <TextInput style={st.input} placeholder="Auto-filled from map pin" placeholderTextColor="#94a3b8" value={locationText} onChangeText={setLocationText} />
              <Text style={[st.label, { marginTop: 10 }]}>Municipal Ward Office *</Text>
              <TouchableOpacity style={st.pickerBtn} onPress={() => setWardPickerVisible(true)}>
                <Text style={{ color: selectedWardId ? '#0f172a' : '#94a3b8', fontSize: 14, flex: 1 }}>
                  {selectedWardId ? `${wards.find(w => w.id === selectedWardId)?.office_name} - Ward ${wards.find(w => w.id === selectedWardId)?.ward_no}` : 'Select your ward...'}
                </Text>
                <Text style={{ color: '#94a3b8' }}>▼</Text>
              </TouchableOpacity>
            </View>
            <View style={st.navRow}>
              <TouchableOpacity style={st.backBtn} onPress={() => setStep(1)}><Text style={st.backBtnText}>← Back</Text></TouchableOpacity>
              <TouchableOpacity style={[st.primaryBtn, (!imageUri || !latitude || !longitude) && { opacity: 0.5 }]}
                onPress={() => setStep(3)} disabled={!imageUri || !latitude || !longitude}>
                <Text style={st.primaryBtnText}>Next →</Text></TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={st.instruction}>📝 Final Details</Text>
            <View style={st.section}>
              <Text style={st.label}>Description (Optional)</Text>
              <TextInput style={[st.input, st.textArea]} placeholder="Extra details about the issue..."
                placeholderTextColor="#94a3b8" value={description} onChangeText={setDescription} multiline numberOfLines={4} />
            </View>
            {validatingAI && (
              <View style={st.aiBanner}><ActivityIndicator size="small" color="#fff" /><Text style={st.aiText}>🤖 AI Analyzing Image...</Text></View>
            )}
            <View style={st.navRow}>
              <TouchableOpacity style={st.backBtn} onPress={() => setStep(2)}><Text style={st.backBtnText}>← Back</Text></TouchableOpacity>
              <TouchableOpacity style={[st.submitBtn, (loading || validatingAI) && { opacity: 0.6 }]}
                onPress={handleSubmit} disabled={loading || validatingAI}>
                {loading && !validatingAI ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.primaryBtnText}>✅ Submit Report</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Ward Picker */}
      <Modal visible={wardPickerVisible} transparent animationType="slide">
        <View style={st.modalOv}><View style={st.pickerModal}>
          <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 16, color: '#0f172a' }}>🏛️ Select Your Ward</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {wards.length === 0 ? <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No wards available.</Text> :
            wards.map(w => (
              <TouchableOpacity key={w.id} style={[st.pickerItem, selectedWardId === w.id && { backgroundColor: '#e0f2fe', borderColor: '#0891b2' }]}
                onPress={() => { setSelectedWardId(w.id); setWardPickerVisible(false); }}>
                <Text style={{ fontWeight: '700', color: '#0f172a' }}>{w.office_name}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>Ward {w.ward_no} · {w.area_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={{ marginTop: 12, alignItems: 'center', padding: 12 }} onPress={() => setWardPickerVisible(false)}>
            <Text style={{ color: '#64748b', fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Popup */}
      <Modal visible={popupVisible} transparent animationType="none" onRequestClose={hidePopup}>
        <View style={st.modalOv}>
          <Animated.View style={[st.modalC, { transform: [{ scale: popupScale }] }]}>
            <Text style={{ fontSize: 36, marginBottom: 16 }}>{popupSuccess ? '🎉' : '⚠️'}</Text>
            <Text style={st.modalTitle}>{popupTitle}</Text>
            <Text style={st.modalMsg}>{popupMessage}</Text>
            <TouchableOpacity style={[st.modalBtn, popupSuccess && { backgroundColor: '#059669' }]} onPress={hidePopup}>
              <Text style={st.modalBtnText}>{popupSuccess ? 'View Dashboard' : 'Got It'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  ctaBtn: { backgroundColor: '#0891b2', padding: 12, borderRadius: 10, marginTop: 10 },
  ctaBtnText: { color: '#fff', fontWeight: '700' },
  container: { padding: 20, backgroundColor: '#f0f4f8', paddingBottom: 40, flexGrow: 1 },
  header: { marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  stepIndicator: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 6 },
  stepDot: { width: 30, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  stepDotActive: { backgroundColor: '#0891b2' },
  subtitle: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  instruction: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  emojiBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardEmoji: { fontSize: 24 },
  cardTextBlock: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  previewImg: { width: '100%', height: 200, borderRadius: 14, marginBottom: 14 },
  placeholder: { width: '100%', height: 150, backgroundColor: '#f8fafc', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  placeholderText: { color: '#94a3b8', fontWeight: '600' },
  btnRow: { flexDirection: 'row', justifyContent: 'center' },
  secBtn: { backgroundColor: '#f0f4f8', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  secBtnText: { color: '#0891b2', fontWeight: '700', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155' },
  liveLocBtn: { backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  liveLocText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 14, color: '#0f172a' },
  coordRow: { flexDirection: 'row', marginBottom: 10 },
  mapWrap: { width: '100%', marginTop: 10, borderRadius: 10, overflow: 'hidden' },
  mapHint: { fontSize: 11, color: '#64748b', textAlign: 'center', marginBottom: 6, fontWeight: '600' },
  pickerBtn: { height: 46, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#f8fafc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#f1f5f9' },
  backBtnText: { color: '#475569', fontWeight: '700' },
  primaryBtn: { flex: 1, marginLeft: 12, backgroundColor: '#0891b2', paddingVertical: 14, borderRadius: 12, alignItems: 'center', shadowColor: '#0891b2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  submitBtn: { flex: 1, marginLeft: 12, backgroundColor: '#059669', paddingVertical: 14, borderRadius: 12, alignItems: 'center', shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  aiBanner: { flexDirection: 'row', backgroundColor: '#7c3aed', padding: 16, borderRadius: 14, marginTop: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  aiText: { color: '#fff', fontWeight: '700', marginLeft: 10 },
  modalOv: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerModal: { backgroundColor: '#fff', width: '100%', maxWidth: 400, borderRadius: 24, padding: 24 },
  pickerItem: { padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 8 },
  modalC: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', elevation: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  modalMsg: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtn: { backgroundColor: '#0891b2', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, elevation: 4 },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});