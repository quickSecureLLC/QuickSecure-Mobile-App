import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Text, Icon } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_VERSION = '2.5.0'; // Hardcoded version since we can't use expo-constants

interface UserScreenProps {
  onClose: () => void;
}

export const UserScreen: React.FC<UserScreenProps> = ({ onClose }) => {
  const { userRole, userEmail } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [emergencyAlertsEnabled, setEmergencyAlertsEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricAvailability();
    checkNotificationSettings();
    loadProfileImage();
  }, []);

  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.log('Error loading profile image:', error);
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
      
      if (source === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert(
            'Permission Required',
            'Please allow camera access in your device settings to take photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert(
            'Permission Required',
            'Please allow photo library access in your device settings to choose photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        await AsyncStorage.setItem('profileImage', imageUri);
        setProfileImage(imageUri);
      }
    } catch (error) {
      console.log('Error picking image:', error);
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
      console.log('Error checking biometric availability:', error);
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
      console.log('Error checking notification settings:', error);
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
      console.log('Error toggling notifications:', error);
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
      console.log('Error toggling biometric:', error);
      Alert.alert('Error', `Unable to configure ${biometricType}. Please try again.`);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@quicksecurellc.com');
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
                name="person-circle"
                type="material"
                color="#3498db"
                size={80}
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
          <Text style={styles.roleBadge}>{userRole}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          
          <View style={styles.infoItem}>
            <Icon name="person" type="material" color="#666" size={20} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{userRole}</Text>
            </View>
          </View>

          {userEmail && (
            <View style={styles.infoItem}>
              <Icon name="email" type="material" color="#666" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userEmail}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoItem}>
            <Icon name="info" type="material" color="#666" size={20} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>{APP_VERSION}</Text>
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
      </ScrollView>
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
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
}); 