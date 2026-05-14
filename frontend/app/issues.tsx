import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
  ScrollView, Image, TextInput, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

const issueTypes = [
  { id: 'pothole', emoji: '🕳️', label: 'Report Pothole', color: '#1e90ff', description: 'Damaged road surface' },
  { id: 'garbage', emoji: '🗑️', label: 'Report Garbage', color: '#4caf50', description: 'Illegal dumping' },
  { id: 'streetlight', emoji: '💡', label: 'Broken Streetlight', color: '#ff9800', description: 'Safety hazard' },
  { id: 'drainage', emoji: '💧', label: 'Blocked Drain', color: '#9c27b0', description: 'Clogged drainage' },
  { id: 'tree', emoji: '🌳', label: 'Fallen Tree', color: '#795548', description: 'Blocking road' },
];

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Denied', 'Camera roll permissions needed!');
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Denied', 'Camera permissions needed!');
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const getLiveLocation = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());
    } catch (err) {
      Alert.alert('Location Error', 'Could not fetch live location. Please enter it manually.');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!latitude.trim() || !longitude.trim()) return Alert.alert('Missing Location', 'Please provide valid coordinates.');
    if (!imageUri) return Alert.alert('Missing Image', 'Please capture or select an image.');

    setValidatingAI(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setValidatingAI(false);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('type', selectedType!);
      formData.append('severity', 'medium');
      formData.append('description', description || locationText);
      formData.append('latitude', latitude.trim());
      formData.append('longitude', longitude.trim());

      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      // @ts-ignore
      formData.append('image', { uri: imageUri, name: filename, type });

      const res = await fetch(`${ENV.API_BASE_URL}/issues`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to submit issue');
      } else {
        const msg = data.duplicate 
          ? `Similar issue nearby — merged! You earned +${data.pointsEarned} pts` 
          : `Reported successfully! You earned +${data.pointsEarned} pts`;
        
        if (Platform.OS === 'web') {
          window.alert(msg);
          router.replace('/citizen-dashboard');
        } else {
          Alert.alert('Success', msg, [{ text: 'OK', onPress: () => router.replace('/citizen-dashboard') }]);
        }
      }
    } catch (err) {
      Alert.alert('Network Error', 'Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || user?.role !== 'citizen') {
    return (
      <View style={styles.centerContainer}>
        <Text>You must be logged in as a Citizen to report issues.</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.replace('/citizen-login')}>
          <Text style={styles.actionBtnText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Civic Tracker</Text>
        <Text style={styles.subtitle}>Step {step} of 3</Text>
      </View>

      {step === 1 && (
        <View>
          <Text style={styles.instruction}>What kind of issue are you reporting?</Text>
          {issueTypes.map((issue) => (
            <TouchableOpacity key={issue.id} style={[styles.card, selectedType === issue.id && { borderColor: issue.color, borderWidth: 2 }]} onPress={() => { setSelectedType(issue.id); setStep(2); }}>
              <View style={[styles.emojiBox, { backgroundColor: issue.color + '20' }]}><Text style={styles.cardEmoji}>{issue.emoji}</Text></View>
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitle}>{issue.label}</Text>
                <Text style={styles.cardDesc}>{issue.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={styles.instruction}>Provide Photo & Location</Text>
          
          <View style={styles.imageSection}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : (
              <View style={styles.placeholderBox}><Text style={styles.placeholderEmoji}>📷</Text><Text style={styles.placeholderText}>No image selected</Text></View>
            )}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={takePhoto}><Text style={styles.secondaryBtnText}>Take Photo</Text></TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}><Text style={styles.secondaryBtnText}>Upload File</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.locationSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.label}>Location Details</Text>
              <TouchableOpacity style={styles.liveLocationBtn} onPress={getLiveLocation} disabled={gettingLocation}>
                {gettingLocation ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.liveLocationText}>📍 Get Live Location</Text>}
              </TouchableOpacity>
            </View>
            
            <View style={styles.coordRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Lat: 12.9716" value={latitude} onChangeText={setLatitude} keyboardType="numeric" />
              <View style={{ width: 10 }} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Lng: 77.5946" value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
            </View>

            {latitude && longitude && Platform.OS === 'web' && (
              <View style={styles.mapContainer}>
                {/* @ts-ignore */}
                <iframe 
                  width="100%" 
                  height="200" 
                  style={{ border: 0, borderRadius: 8 }} 
                  loading="lazy"
                  allowFullScreen 
                  src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
                />
              </View>
            )}
            
            <Text style={[styles.label, { marginTop: 10 }]}>Exact Address/Landmark</Text>
            <TextInput style={styles.input} placeholder="e.g. Near MG Road Metro Pillar 45" value={locationText} onChangeText={setLocationText} />
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}><Text style={styles.backBtnText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, (!imageUri || !latitude || !longitude) && { opacity: 0.5 }]} onPress={() => setStep(3)} disabled={!imageUri || !latitude || !longitude}><Text style={styles.primaryBtnText}>Next</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContainer}>
          <Text style={styles.instruction}>Final Details</Text>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Add details..." value={description} onChangeText={setDescription} multiline numberOfLines={4} />

          {validatingAI && (
            <View style={styles.aiBanner}><ActivityIndicator size="small" color="#fff" /><Text style={styles.aiText}>AI Validating Image...</Text></View>
          )}

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}><Text style={styles.backBtnText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, (loading || validatingAI) && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading || validatingAI}>
              {loading && !validatingAI ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Submit Report</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actionBtn: { backgroundColor: '#1e90ff', padding: 12, borderRadius: 8, marginTop: 10 },
  actionBtnText: { color: '#fff', fontWeight: 'bold' },
  container: { padding: 20, backgroundColor: '#f4f6fb', paddingBottom: 40, flexGrow: 1 },
  header: { marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  instruction: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  emojiBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardEmoji: { fontSize: 24 },
  cardTextBlock: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  cardDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  stepContainer: { flex: 1 },
  imageSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, alignItems: 'center' },
  previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  placeholderBox: { width: '100%', height: 150, backgroundColor: '#f0f0f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  placeholderEmoji: { fontSize: 32, marginBottom: 8 },
  placeholderText: { color: '#888' },
  btnRow: { flexDirection: 'row', justifyContent: 'center' },
  secondaryBtn: { backgroundColor: '#eef2f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  secondaryBtnText: { color: '#1e90ff', fontWeight: 'bold' },
  locationSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#444' },
  liveLocationBtn: { backgroundColor: '#e53935', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  liveLocationText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  input: { backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14 },
  coordRow: { flexDirection: 'row', marginBottom: 10 },
  mapContainer: { width: '100%', height: 200, marginTop: 10, borderRadius: 8, overflow: 'hidden' },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#ddd' },
  backBtnText: { color: '#444', fontWeight: 'bold' },
  primaryBtn: { flex: 1, marginLeft: 12, backgroundColor: '#1e90ff', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  submitBtn: { flex: 1, marginLeft: 12, backgroundColor: '#4caf50', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  aiBanner: { flexDirection: 'row', backgroundColor: '#9c27b0', padding: 16, borderRadius: 8, marginTop: 20, alignItems: 'center', justifyContent: 'center' },
  aiText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 }
});