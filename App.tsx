import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { UserScreen } from './src/screens/UserScreen';
import { QuickSecureLogo } from './src/components/QuickSecureLogo';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { SecureStorage } from './src/services/SecureStorage';
import * as LocalAuthentication from 'expo-local-authentication';
import { AuthGate } from './src/components/AuthGate';
import { AppContent } from './src/components/AppContent';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/services/NavigationService';
import { AppNavigator } from './src/navigation/AppNavigator';

const { width, height } = Dimensions.get('window');
const HOLD_DURATION = 3000; // 3 seconds to activate
const RETRACT_DURATION = 600; // Slower retraction animation
const BUTTON_SIZE = width * 0.7; // Slightly smaller button
const SCREEN_DIAGONAL = Math.sqrt(Math.pow(height, 2) + Math.pow(width, 2));
const EMERGENCY_RED = '#FF3B30';
const EMERGENCY_BUTTON_SIZE = width * 0.7;
const HEADER_ICON_SIZE = 24;
const LOGO_SIZE = 60; // New larger logo size
const HEADER_HEIGHT = 80;

interface ModalButton {
  text: string;
  type?: 'primary' | 'secondary';
  onPress?: () => void;
}

interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: ModalButton[];
  onClose: () => void;
}

interface ModalConfig {
  title: string;
  message: string;
  buttons: ModalButton[];
}

const CustomModal: React.FC<CustomModalProps> = ({ visible, title, message, buttons, onClose }) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <View style={styles.modalButtons}>
          {buttons.map((button: ModalButton, index: number) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.modalButton,
                button.type === 'primary' && styles.modalButtonPrimary,
              ]}
              onPress={() => {
                button.onPress?.();
                onClose();
              }}
            >
              <Text style={[
                styles.modalButtonText,
                button.type === 'primary' && styles.modalButtonTextPrimary,
              ]}>
                {button.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  </Modal>
);

interface HeaderProps {
  onUserPress: () => void;
}

const Header: React.FC<HeaderProps> = ({ onUserPress }) => (
  <View style={styles.headerContainer}>
    <View style={styles.headerContent}>
      <View style={styles.headerLeft}>
        <QuickSecureLogo width={LOGO_SIZE} height={LOGO_SIZE} color="#FFFFFF" />
      </View>
      <View style={styles.headerCenter}>
        <Text style={styles.title}>QuickSecure</Text>
        <Text style={styles.subtitle}>Teacher Safety System</Text>
      </View>
      <TouchableOpacity 
        style={styles.headerRight}
        onPress={onUserPress}
      >
        <Ionicons name="person-circle-outline" size={LOGO_SIZE * 0.6} color="white" />
      </TouchableOpacity>
    </View>
  </View>
);

const WarningTriangle: React.FC<{ isActive: boolean; onPress: () => void }> = ({ isActive, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      ]);

      Animated.loop(pulse).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <TouchableOpacity 
      style={styles.warningTriangleContainer}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.warningTriangle,
          {
            opacity: pulseAnim,
          }
        ]}
      >
        <Ionicons name="warning" size={EMERGENCY_BUTTON_SIZE * 0.5} color={EMERGENCY_RED} />
      </Animated.View>
    </TouchableOpacity>
  );
};

interface EmergencyActivatedScreenProps {
  onMinimize: () => void;
  onCancel: () => void;
}

const EmergencyActivatedScreen: React.FC<EmergencyActivatedScreenProps> = ({ onMinimize, onCancel }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.4,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]);

    Animated.loop(pulse).start();
  }, []);

  return (
    <TouchableOpacity 
      style={styles.emergencyActivatedScreen}
      activeOpacity={1}
      onPress={onMinimize}
    >
      <View style={styles.emergencyBackground} />
      <Animated.View 
        style={[
          styles.emergencyPulse,
          {
            opacity: pulseAnim,
          }
        ]}
      />
      <View style={styles.emergencyMessageContainer}>
        <Text style={styles.emergencyMessagePrimary}>
          EMERGENCY RESPONDERS{'\n'}DISPATCHED
        </Text>
        <Text style={styles.emergencyMessageSecondary}>
          Administration has been notified
        </Text>
      </View>
      <TouchableOpacity
        style={styles.emergencyCancelButton}
        onPress={onCancel}
      >
        <Text style={styles.emergencyCancelButtonText}>Cancel Emergency</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

interface GuidanceScreenProps {
  title: string;
  guidance: string[];
  onClose: () => void;
}

const GuidanceScreen: React.FC<GuidanceScreenProps> = ({ title, guidance, onClose }) => {
  return (
    <View style={styles.guidanceScreen}>
      <View style={styles.guidanceContent}>
        <Text style={styles.guidanceTitle}>{title}</Text>
        <ScrollView style={styles.guidanceScroll}>
          {guidance.map((item, index) => (
            <View key={index} style={styles.guidanceItem}>
              <Text style={styles.guidanceText}>• {item}</Text>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity 
          style={styles.guidanceCloseButton}
          onPress={onClose}
        >
          <Text style={styles.guidanceCloseButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const GUIDANCE_DATA = {
  admin: {
    title: "Call Administrator – Guidance",
    guidance: [
      "Remain calm and speak in a low, steady voice to reduce tension in the room.",
      "Focus on de-escalation — avoid confrontation or emotional reactions.",
      "Do not place hands on students unless there is an immediate threat to safety.",
      "Follow your school's protocol for classroom disruptions or behavioral concerns.",
      "Move other students away from the situation quietly, without creating alarm.",
      "If necessary, discreetly assign a student to alert a nearby staff member for support."
    ]
  },
  fire: {
    title: "Fire Emergency – Guidance",
    guidance: [
      "Leave all personal and classroom items behind.",
      "Take your emergency folder or roll sheet if it's immediately accessible — don't delay.",
      "Use your assigned exit route unless blocked — never assume someone else has checked the hallway.",
      "Keep students calm and silent to hear further instructions.",
      "Once outside, line up in your designated area and take a quick headcount.",
      "Never re-enter the building until cleared by official responders."
    ]
  },
  medical: {
    title: "Medical Emergency – Guidance",
    guidance: [
      "Ensure the scene is safe before approaching — do not put yourself at risk.",
      "If trained, begin basic first aid while waiting for help.",
      "Assign a student to quietly alert a nearby staff member or flag down responders if needed.",
      "Shield the student from view if appropriate — preserve their privacy.",
      "Keep other students calm and away from the affected individual."
    ]
  }
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  mainContent: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  headerContainer: {
    width: '100%',
    height: HEADER_HEIGHT,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  emergencyContainer: {
    height: EMERGENCY_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  warningTriangleContainer: {
    width: EMERGENCY_BUTTON_SIZE,
    height: EMERGENCY_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningTriangle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  panicButtonContainer: {
    width: EMERGENCY_BUTTON_SIZE,
    height: EMERGENCY_BUTTON_SIZE,
    position: 'relative',
  },
  emergencyOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: EMERGENCY_RED,
    borderRadius: BUTTON_SIZE / 2,
    zIndex: 1,
  },
  panicButton: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: EMERGENCY_RED,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 2,
  },
  panicButtonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  panicButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    zIndex: 3,
  },
  panicButtonSubtext: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 8,
    zIndex: 3,
  },
  quickActions: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  actionButton: {
    width: '100%',
    padding: 20,
    marginBottom: 15,
    borderRadius: 15,
  },
  actionButton1: {
    backgroundColor: '#424242',
  },
  actionButton2: {
    backgroundColor: '#333333',
  },
  actionButton3: {
    backgroundColor: '#212121',
  },
  actionButtonText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  modalButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#ff3b30',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
  },
  emergencyActivatedScreen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  emergencyBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  emergencyPulse: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: EMERGENCY_RED,
  },
  emergencyMessageContainer: {
    alignItems: 'center',
    padding: 20,
    zIndex: 1,
  },
  emergencyMessagePrimary: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 20,
  },
  emergencyMessageSecondary: {
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  emergencyCancelButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  emergencyCancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  guidanceScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1500,
  },
  guidanceContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  guidanceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  guidanceScroll: {
    maxHeight: '70%',
  },
  guidanceItem: {
    marginBottom: 15,
  },
  guidanceText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  guidanceCloseButton: {
    backgroundColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 20,
  },
  guidanceCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
