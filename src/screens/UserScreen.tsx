import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  Alert,
  Linking,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { Text, Icon } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorage } from '../services/SecureStorage';
import { AuthService } from '../services/AuthService';
import { LocationService, type Coordinates, getFloorEstimation } from '../services/LocationService';
import { AppLog } from '../utils/logger';

const APP_VERSION = '2.5.0'; // Hardcoded version since we can't use expo-constants
const PERMISSIONS_REQUESTED_KEY = 'qs_permissions_requested';

interface UserScreenProps {
  onClose: () => void;
}

interface DevCredentials {
  username: string;
  password: string;
  hasToken: boolean;
}

export const UserScreen: React.FC<UserScreenProps> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [emergencyAlertsEnabled, setEmergencyAlertsEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [devCreds, setDevCreds] = useState<DevCredentials | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [userName, setUserName] = useState(user ? `${user.first_name} ${user.last_name}` : '');
  const [schoolModalVisible, setSchoolModalVisible] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<Coordinates | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [floorEstimation, setFloorEstimation] = useState<any>(null);
  const permissionsRequested = useRef(false);

  useEffect(() => {
    checkBiometricAvailability();
    checkNotificationSettings();
    loadProfileImage();
    if (user && user.first_name && user.last_name) {
      setUserName(`${user.first_name} ${user.last_name}`);
    } else if (user?.first_name) {
      setUserName(user.first_name);
    }
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    }
    if (__DEV__) {
      loadDevCredentials();
    }
    if (!permissionsRequested.current) {
      (async () => {
        try {
          const alreadyRequested = await AsyncStorage.getItem(PERMISSIONS_REQUESTED_KEY);
          const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
          const mediaStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
          if (!alreadyRequested && (!cameraStatus.granted || !mediaStatus.granted)) {
            if (!cameraStatus.granted) {
              await ImagePicker.requestCameraPermissionsAsync();
            }
            if (!mediaStatus.granted) {
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            }
            await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
          }
          permissionsRequested.current = true;
        } catch (error) {
          AppLog.error('Error requesting permissions:', error);
        }
      })();
    }
  }, [user]);

  const loadUserName = async () => {
    try {
      const savedName = await AsyncStorage.getItem('userName');
      if (savedName) {
        setUserName(savedName);
      }
    } catch (error) {
      AppLog.error('Error loading user name:', error);
    }
  };

  const handleNameSave = async () => {
    try {
      await AsyncStorage.setItem('userName', userName);
      setIsEditingName(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error) {
      AppLog.error('Error saving name:', error);
      Alert.alert('Error', 'Failed to save name. Please try again.');
    }
  };

  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      AppLog.info('Error loading profile image:', error);
    }
  };

  const handleImagePick = async () => {
    const options = ['Take Photo', 'Choose from Library', 'Cancel'];
    Alert.alert(
      'Update Profile Photo',
      'Choose an option',
      [
        {
          text: options[0],
          onPress: () => pickImage('camera'),
        },
        {
          text: options[1],
          onPress: () => pickImage('library'),
        },
        {
          text: options[2],
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      let permissionResult;
      let result;
      if (source === 'camera') {
        permissionResult = await ImagePicker.getCameraPermissionsAsync();
        if (!permissionResult.granted) {
          permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        }
        if (!permissionResult.granted) {
          Alert.alert(
            'Permission Required',
            'Please allow camera access in your device settings to take photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          AppLog.error('Camera permission denied');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        }
        if (!permissionResult.granted) {
          Alert.alert(
            'Permission Required',
            'Please allow photo library access in your device settings to choose photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          AppLog.error('Photo library permission denied');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await AsyncStorage.setItem('profileImage', imageUri);
        setProfileImage(imageUri);
      } else if (result.canceled) {
        AppLog.info('Image picker canceled by user');
      } else {
        Alert.alert('Error', 'No image selected.');
      }
    } catch (error) {
      AppLog.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile photo');
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const available = await LocalAuthentication.hasHardwareAsync();
      if (available) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const savedBiometricEnabled = await LocalAuthentication.isEnrolledAsync();
        
        setBiometricAvailable(true);
        setBiometricEnabled(savedBiometricEnabled);
        setBiometricType(
          types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
            ? 'Face ID'
            : 'Touch ID'
        );
      }
    } catch (error) {
      AppLog.error('Error checking biometric availability:', error);
    }
  };

  const checkNotificationSettings = async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(settings.granted);
      // If notifications are enabled, check if emergency alerts were previously enabled
      if (settings.granted) {
        setEmergencyAlertsEnabled(true); // Or get this from AsyncStorage if you want to persist the setting
      }
    } catch (error) {
      AppLog.error('Error checking notification settings:', error);
    }
  };

  const handleNotificationToggle = async () => {
    try {
      if (notificationsEnabled) {
        // If trying to disable, show explanation and link to settings
        Alert.alert(
          'Notification Settings',
          'To disable notifications, please use your device settings',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
      
      if (status === 'granted') {
        Alert.alert(
          'Notifications Enabled',
          'You will now receive important updates and alerts'
        );
        setEmergencyAlertsEnabled(true);
      }
    } catch (error) {
      AppLog.error('Error toggling notifications:', error);
    }
  };

  const handleEmergencyAlertsToggle = async () => {
    if (!notificationsEnabled) {
      Alert.alert(
        'Enable Notifications',
        'Please enable notifications first to receive emergency alerts',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: handleNotificationToggle }
        ]
      );
      return;
    }
    setEmergencyAlertsEnabled(!emergencyAlertsEnabled);
  };

  const handleBiometricToggle = async () => {
    if (!biometricAvailable) {
      Alert.alert('Not Available', `${biometricType} is not available on this device`);
      return;
    }

    try {
      // Check if biometrics are enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!isEnrolled) {
        Alert.alert(
          'Biometric Setup Required',
          `Please set up ${biometricType} in your device settings first`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return;
      }

      // Authenticate before changing the setting
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Verify ${biometricType} to ${biometricEnabled ? 'disable' : 'enable'} authentication`,
        disableDeviceFallback: false,
      });

      if (result.success) {
        setBiometricEnabled(!biometricEnabled);
        Alert.alert(
          'Success',
          `${biometricType} has been ${!biometricEnabled ? 'enabled' : 'disabled'}`
        );
      }
    } catch (error) {
      AppLog.error('Error toggling biometric:', error);
      Alert.alert('Error', `Unable to configure ${biometricType}. Please try again.`);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@quicksecurellc.com');
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose(); // Close the user profile screen
    } catch (error) {
      AppLog.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const loadDevCredentials = async () => {
    try {
      const credentials = await SecureStorage.getCredentials();
      const token = await SecureStorage.getItemAsync('qs_auth_token');
      setDevCreds({
        username: credentials?.email ?? '—',
        password: credentials?.password ?? '—',
        hasToken: !!token
      });
    } catch (error) {
      AppLog.error('Error loading dev credentials:', error);
    }
  };

  // Add a refresh function for dev credentials
  const refreshDevCredentials = () => {
    if (__DEV__) {
      loadDevCredentials();
    }
  };

  const handleGetGpsLocation = async () => {
    setGpsLoading(true);
    setGpsError('');
    try {
      const data = await getFloorEstimation();
      setFloorEstimation(data);
      setGpsLocation(data ? { latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy, timestamp: data.timestamp } : null);
    } catch (err) {
      setGpsError(err instanceof Error ? err.message : 'Failed to get location');
    }
    setGpsLoading(false);
  };

  const handleTestFreshGps = async () => {
    setGpsLoading(true);
    setGpsError('');
    try {
      AppLog.info('Testing fresh GPS fetch...');
      const startTime = Date.now();
      const location = await LocationService.getFreshLocationForEmergency();
      const duration = Date.now() - startTime;
      
      if (location) {
        setGpsLocation(location);
        const validation = await LocationService.validateLocationAccuracy(location);
        setGpsError(`GPS obtained in ${duration}ms - Lat: ${location.latitude}, Lon: ${location.longitude}, Accuracy: ${location.accuracy}m, Quality: ${validation.quality}`);
      } else {
        setGpsError('No location data received');
      }
    } catch (err) {
      setGpsError(`GPS test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setGpsLoading(false);
  };

  const handleTestMostAccurateGps = async () => {
    setGpsLoading(true);
    setGpsError('');
    try {
      AppLog.info('Testing current location...');
      const startTime = Date.now();
      const location = await LocationService.getCurrentLocation();
      const duration = Date.now() - startTime;
      
      setGpsLocation(location);
      const validation = await LocationService.validateLocationAccuracy(location);
      setGpsError(`Current location obtained in ${duration}ms - Lat: ${location.latitude}, Lon: ${location.longitude}, Accuracy: ${location.accuracy}m, Quality: ${validation.quality}`);
    } catch (err) {
      setGpsError(`Current location test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setGpsLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Icon name="arrow-back" type="material" color="#fff" size={24} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleImagePick}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <Icon
                name="account-circle"
                type="material"
                color="#3498db"
                size={80}
                accessibilityLabel="Default profile icon"
              />
            )}
            <View style={styles.editIconContainer}>
              <Icon
                name="camera-alt"
                type="material"
                color="#fff"
                size={20}
              />
            </View>
          </TouchableOpacity>
          <View style={[
            styles.roleBadge,
            user?.role === 'admin' && styles.roleBadgeAdmin,
            user?.role === 'super_admin' && styles.roleBadgeSuperAdmin,
            user?.role === 'teacher' && styles.roleBadgeTeacher,
          ]}>
            <Text style={styles.roleBadgeText}>{(user?.role || 'User').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          
          <View style={styles.infoItem}>
            <Icon name="person" type="material" color="#666" size={20} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              {isEditingName ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={userName}
                    onChangeText={setUserName}
                    placeholder="Enter your name"
                    placeholderTextColor="#666"
                    autoFocus
                  />
                  <View style={styles.nameEditButtons}>
                    <TouchableOpacity 
                      style={[styles.nameEditButton, styles.nameSaveButton]}
                      onPress={handleNameSave}
                    >
                      <Icon name="check" type="material" color="#fff" size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.nameEditButton, styles.nameCancelButton]}
                      onPress={() => {
                        setIsEditingName(false);
                        setUserName(user ? `${user.first_name} ${user.last_name}` : '');
                      }}
                    >
                      <Icon name="close" type="material" color="#fff" size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.nameDisplayContainer}
                  onPress={() => setIsEditingName(true)}
                >
                  <Text style={styles.infoValue}>{userName || 'Add name'}</Text>
                  <Icon name="edit" type="material" color="#666" size={20} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {user?.email && (
            <View style={styles.infoItem}>
              <Icon name="email" type="material" color="#666" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            </View>
          )}

          {user?.department && (
            <View style={styles.infoItem}>
              <Icon name="business" type="material" color="#666" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>{user.department}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoItem}>
            <Icon name="school" type="material" color="#666" size={20} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>School Name</Text>
              <Text style={styles.infoValue}>{user?.school_name || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Icon name="notifications" type="material" color="#666" size={20} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Enable Notifications</Text>
                <Text style={styles.settingDescription}>Receive important updates and alerts</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={notificationsEnabled ? '#2196F3' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Icon name="warning" type="material" color="#666" size={20} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Emergency Alerts</Text>
                <Text style={styles.settingDescription}>High-priority emergency notifications</Text>
              </View>
            </View>
            <Switch
              value={emergencyAlertsEnabled}
              onValueChange={handleEmergencyAlertsToggle}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={emergencyAlertsEnabled ? '#2196F3' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Settings</Text>
          
          {biometricAvailable && (
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Icon name="fingerprint" type="material" color="#666" size={20} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>{biometricType}</Text>
                  <Text style={styles.settingDescription}>
                    Use {biometricType} for quick and secure access
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={biometricEnabled ? '#2196F3' : '#f4f3f4'}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          
          <TouchableOpacity style={styles.supportItem} onPress={handleContactSupport}>
            <Icon name="email" type="material" color="#666" size={20} />
            <View style={styles.supportContent}>
              <Text style={styles.supportText}>support@quicksecurellc.com</Text>
              <Text style={styles.supportDescription}>Contact technical support</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.supportItem}>
            <Icon name="support-agent" type="material" color="#666" size={20} />
            <View style={styles.supportContent}>
              <Text style={styles.supportText}>Contact your administrator</Text>
              <Text style={styles.supportDescription}>For immediate assistance</Text>
            </View>
          </View>
        </View>

        {__DEV__ && (
          <View style={styles.devCard}>
            <Text style={styles.devTitle}>DEV USER DATA</Text>
            <ScrollView style={{ maxHeight: 200, backgroundColor: '#222', borderRadius: 8, marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }}>
                {JSON.stringify(user, null, 2)}
              </Text>
            </ScrollView>
            <Text style={styles.devTitle}>DEV TOKEN</Text>
            <Text style={styles.devText}>{devCreds?.hasToken ? 'Token present' : 'No token'}</Text>
            <Text style={styles.devTitle}>DEV CREDENTIALS (tap to refresh)</Text>
            <Text style={styles.devText}>Username: {devCreds?.username}</Text>
            <Text style={styles.devText}>Password: {devCreds?.password}</Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Test GPS Location</Text>
            <TouchableOpacity
              style={[styles.button, gpsLoading && { opacity: 0.6 }]}
              onPress={handleGetGpsLocation}
              disabled={gpsLoading}
              accessibilityRole="button"
              accessibilityLabel="Get current GPS location"
            >
              <Text style={styles.buttonText}>{gpsLoading ? 'Getting location...' : 'Get Current GPS Location'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, gpsLoading && { opacity: 0.6 }, { marginTop: 10, backgroundColor: '#FF6B35' }]}
              onPress={handleTestFreshGps}
              disabled={gpsLoading}
              accessibilityRole="button"
              accessibilityLabel="Test fresh GPS for emergency"
            >
              <Text style={styles.buttonText}>{gpsLoading ? 'Testing GPS...' : 'Test Fresh GPS (Emergency)'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, gpsLoading && { opacity: 0.6 }, { marginTop: 10, backgroundColor: '#4CAF50' }]}
              onPress={handleTestMostAccurateGps}
              disabled={gpsLoading}
              accessibilityRole="button"
              accessibilityLabel="Test current location"
            >
              <Text style={styles.buttonText}>{gpsLoading ? 'Getting Location...' : 'Get Current Location'}</Text>
            </TouchableOpacity>
            
            {floorEstimation && (
              <View style={styles.codeBlock}>
                <Text selectable style={styles.codeText}>{JSON.stringify(floorEstimation, null, 2)}</Text>
              </View>
            )}
            {gpsError ? (
              <Text style={{ color: 'red', marginTop: 8 }}>{gpsError}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.infoItem}>
            <Icon name="info" type="material" color="#666" size={20} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>{APP_VERSION}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={schoolModalVisible}
        animationType="fade"
        onRequestClose={() => setSchoolModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>School Code</Text>
            <Text style={styles.modalMessage}>{user?.school_code || 'N/A'}</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => setSchoolModalVisible(false)}
              accessibilityRole="button"
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    zIndex: 1000,
  },
  safeArea: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: '#2a2a2a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#2a2a2a',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginLeft: -12,
  },
  backButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Offset for back button
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  roleBadge: {
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  roleBadgeAdmin: {
    backgroundColor: '#3498db', // blue
  },
  roleBadgeSuperAdmin: {
    backgroundColor: '#9b59b6', // purple
  },
  roleBadgeTeacher: {
    backgroundColor: '#7f8c8d', // gray
  },
  roleBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  settingTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#fff',
  },
  settingDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  supportContent: {
    marginLeft: 15,
    flex: 1,
  },
  supportText: {
    fontSize: 16,
    color: '#fff',
  },
  supportDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3498db',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  logoutButton: {
    backgroundColor: '#333333',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  devCard: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  devTitle: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  devText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 5,
  },
  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  nameInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginRight: 10,
  },
  nameEditButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  nameEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameSaveButton: {
    backgroundColor: '#2196F3',
  },
  nameCancelButton: {
    backgroundColor: '#666',
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
  },
  modalButtonPrimary: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  codeBlock: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  codeText: {
    color: '#fff',
    fontSize: 14,
  },
}); 