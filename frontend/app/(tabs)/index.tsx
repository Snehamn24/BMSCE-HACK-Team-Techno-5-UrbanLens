import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';

export default function HomeScreen() {
  return (
    <ImageBackground
      source={require('../../assets/images/background.jpg')}
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.5 }}
    >
      <View style={styles.overlay}>

        {/* Top Buttons */}
        <View style={styles.topButtons}>
          <TouchableOpacity style={styles.authButton}>
            <Text style={styles.authText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.authButton}>
            <Text style={styles.authText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Center Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Urban Lens</Text>

          <Text style={styles.subtitle}>
            AI Powered Civic Infrastructure Tracker
          </Text>

          <TouchableOpacity style={styles.mainButton}>
            <Text style={styles.mainButtonText}>
              Report Civic Issue
            </Text>
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
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  topButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 50,
    paddingHorizontal: 20,
  },

  authButton: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginLeft: 10,
  },

  authText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },

  subtitle: {
    fontSize: 20,
    color: '#f0f0f0',
    textAlign: 'center',
    marginBottom: 40,
  },

  mainButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 16,
    paddingHorizontal: 35,
    borderRadius: 14,
  },

  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});