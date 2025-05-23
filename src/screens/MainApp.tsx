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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { UserScreen } from './UserScreen';
import { QuickSecureLogo } from '../components/QuickSecureLogo';
import { useAuth } from '../context/AuthContext';

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

const { width, height } = Dimensions.get('window');
const HOLD_DURATION = 3000; // 3 seconds to activate
const RETRACT_DURATION = 600; // Slower retraction animation
const BUTTON_SIZE = width * 0.7; // Slightly smaller button
const SCREEN_DIAGONAL = Math.sqrt(Math.pow(height, 2) + Math.pow(width, 2));
const EMERGENCY_RED = '#FF3B30';
const EMERGENCY_BUTTON_SIZE = width * 0.7;
const HEADER_ICON_SIZE = 24;
const LOGO_SIZE = 60;
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

// Copy all your existing components (CustomModal, Header, WarningTriangle, EmergencyActivatedScreen, GuidanceScreen) here

export const MainApp = () => {
  // Copy all your existing state and handlers here
  const [isActivating, setIsActivating] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [showEmergencyButton, setShowEmergencyButton] = useState(true);
  const spreadAnimation = useRef(new Animated.Value(1)).current;
  const blurIntensity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [isEmergencyMinimized, setIsEmergencyMinimized] = useState(false);
  const [activeGuidance, setActiveGuidance] = useState<keyof typeof GUIDANCE_DATA | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Copy all your existing functions here

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Copy your existing render content here */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  // Copy all your existing styles here
}); 