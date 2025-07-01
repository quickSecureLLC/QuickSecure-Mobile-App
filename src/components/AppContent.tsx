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
import { MaterialIcons } from '@expo/vector-icons';
import { UserScreen } from '../screens/UserScreen';
import { QuickSecureLogo } from './QuickSecureLogo';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { EmergencyService } from '../services/EmergencyService';
import { PushNotificationService } from '../services/PushNotificationService';
import { EmergencyActivatedScreen } from './EmergencyActivatedScreen';
import { AppLog } from '../utils/logger';

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

interface ModalConfig {
  title: string;
  message: string;
  buttons: ModalButton[];
}

interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: ModalButton[];
  onClose: () => void;
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

interface GuidanceScreenProps {
  title: string;
  guidance: string[];
  onClose: () => void;
  type: 'admin support' | 'fire' | 'medical';
  userName: string;
  userRoom?: string;
}

const GuidanceScreen: React.FC<GuidanceScreenProps> = ({ 
  title, 
  guidance, 
  onClose, 
  type,
  userName,
  userRoom 
}) => {
  const [showDispatchConfirm, setShowDispatchConfirm] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDispatch = async () => {
    try {
      const success = await EmergencyService.postEmergencyAlert(
        userName,
        type,
        `${type} assistance needed in ${userRoom || 'unknown location'}`
      );
      if (success) {
        setIsDispatched(true);
        setTimeout(() => {
          setShowDispatchConfirm(true);
        }, 500);
      }
    } catch (error) {
      AppLog.error('Error dispatching emergency:', error);
    }
  };

  if (showDispatchConfirm) {
    return (
      <View style={styles.guidanceScreen}>
        <Animated.View 
          style={[
            styles.dispatchConfirmModal,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
          accessibilityRole="alert"
          accessible={true}
        >
          <View style={styles.dispatchConfirmIconContainer}>
            <MaterialIcons 
              name="check-circle" 
              size={72} 
              color="#4CAF50" 
              style={{ marginBottom: 16 }}
              accessibilityLabel="Success"
            />
          </View>
          <Text style={styles.dispatchConfirmTitle} accessibilityRole="header">
            Help Dispatched
          </Text>
          <Text style={styles.dispatchConfirmMessage}>
            {type === 'admin support' ? 'An administrator' : type === 'fire' ? 'Fire response' : 'Medical assistance'} has been dispatched to your location.
          </Text>
          <TouchableOpacity 
            style={styles.dispatchConfirmButton}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.dispatchConfirmButtonText}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.guidanceScreen}>
      <Animated.View 
        style={[
          styles.guidanceContent,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.guidanceHeader}>
          <MaterialIcons 
            name={type === 'admin support' ? 'person' : type === 'fire' ? 'local-fire-department' : 'medical-services'} 
            size={32} 
            color="#333"
          />
          <Text style={styles.guidanceTitle}>{title}</Text>
        </View>
        
        <ScrollView style={styles.guidanceScroll}>
          {guidance.map((item, index) => (
            <Animated.View 
              key={index} 
              style={[
                styles.guidanceItem,
                { 
                  opacity: fadeAnim,
                  transform: [{ 
                    translateX: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }]
                }
              ]}
            >
              <View style={styles.guidanceItemNumber}>
                <Text style={styles.guidanceItemNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.guidanceText}>{item}</Text>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={styles.guidanceActions}>
          <TouchableOpacity 
            style={[styles.guidanceButton, styles.guidanceDispatchButton]}
            onPress={handleDispatch}
            disabled={isDispatched}
          >
            <MaterialIcons name="notifications-active" color="#FFFFFF" size={20} />
            <Text style={styles.guidanceButtonText}>
              {isDispatched ? 'Dispatching...' : 'Dispatch Help'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.guidanceButton, styles.guidanceCloseButton]}
            onPress={onClose}
          >
            <Text style={styles.guidanceCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const GUIDANCE_DATA = {
  'admin support': {
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

export const AppContent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [showEmergencyButton, setShowEmergencyButton] = useState(true);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const spreadAnimation = useRef(new Animated.Value(1)).current;
  const blurIntensity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [isEmergencyMinimized, setIsEmergencyMinimized] = useState(false);
  const [activeGuidance, setActiveGuidance] = useState<keyof typeof GUIDANCE_DATA | null>(null);

  const showModal = (config: ModalConfig) => {
    setModalConfig(config);
  };

  const hideModal = () => {
    setModalConfig(null);
  };

  const resetEmergencyState = async () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    // Animate retraction of the red circle
    Animated.timing(spreadAnimation, {
      toValue: 1,
      duration: RETRACT_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setIsEmergencyActive(false);
      setIsBlurActive(false);
      setShowEmergencyButton(true);
      setIsActivating(false);
    });
    // Fire-and-forget cancel request
    EmergencyService.cancelEmergency()
      .catch(error => {
        AppLog.error('Error canceling emergency:', error);
      });
  };

  const handleEmergency = () => {
    // Start UI transition immediately
    setIsEmergencyActive(true);
    setShowEmergencyButton(false);

    // Fire-and-forget network request
    EmergencyService.postEmergencyAlert(user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown Teacher')
      .catch(error => {
        AppLog.error('Error posting emergency alert:', error);
        // UI is already transitioned, no need to handle error here
      });
  };

  const handleCallAdmin = () => {
    setActiveGuidance('admin support');
  };

  const handleFireEmergency = () => {
    setActiveGuidance('fire');
  };

  const handleMedicalEmergency = () => {
    setActiveGuidance('medical');
  };

  const handleSchoolThreat = () => {
    showModal({
      title: 'School Threat',
      message: 'Administration has been notified. Would you like to place the school into lockdown?',
      buttons: [
        {
          text: 'Yes, Initiate Lockdown',
          type: 'primary',
          onPress: () => {
            setTimeout(() => {
              showModal({
                title: 'Lockdown Initiated',
                message: 'The school is now in lockdown mode',
                buttons: [{ text: 'OK', type: 'primary' }],
              });
            }, 300);
          },
        },
        { text: 'Not Yet' },
      ],
    });
  };

  const startEmergencyAnimation = () => {
    setIsActivating(true);
    setIsBlurActive(true);
    
    // Store animation reference so we can stop it if needed
    animationRef.current = Animated.timing(spreadAnimation, {
      toValue: SCREEN_DIAGONAL / BUTTON_SIZE,
      duration: HOLD_DURATION,
      useNativeDriver: true,
    });
    
    animationRef.current.start(({finished}) => {
      if (finished) {
        handleEmergency();
      }
    });
  };

  const cancelEmergencyAnimation = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    setIsActivating(false);
    setIsBlurActive(false);
    
    // Reset animation immediately
    spreadAnimation.setValue(1);
  };

  const onLongPressEvent = (event: { nativeEvent: { state: number; } }) => {
    switch (event.nativeEvent.state) {
      case State.BEGAN:
        startEmergencyAnimation();
        break;
      
      case State.END:
        if (isActivating) {
          // Only trigger emergency if we were still activating
          handleEmergency();
        }
        break;
      
      case State.FAILED:
      case State.CANCELLED:
        cancelEmergencyAnimation();
        break;
    }
  };

  const handleEmergencyMinimize = () => {
    setIsEmergencyMinimized(true);
  };

  const handleEmergencyMaximize = () => {
    setIsEmergencyMinimized(false);
  };

  const closeGuidance = () => {
    setActiveGuidance(null);
  };

  const handleUserPress = () => {
    setShowUserProfile(true);
  };

  const handleCloseUserProfile = () => {
    setShowUserProfile(false);
  };

  const renderContent = () => (
    <View style={styles.mainContent}>
      <Header onUserPress={handleUserPress} />

      <View style={styles.contentContainer}>
        <View style={styles.emergencyContainer}>
          {isEmergencyActive ? (
            <WarningTriangle 
              isActive={true}
              onPress={handleEmergencyMaximize}
            />
          ) : (
            showEmergencyButton && (
              <LongPressGestureHandler
                onHandlerStateChange={onLongPressEvent}
                minDurationMs={HOLD_DURATION}
                maxDist={20}
              >
                <View style={styles.panicButtonContainer}>
                  <Animated.View 
                    style={[
                      styles.emergencyOverlay,
                      {
                        transform: [{ scale: spreadAnimation }],
                      },
                    ]} 
                  />
                  <View style={styles.panicButton}>
                    <View style={styles.panicButtonContent}>
                      <Text style={styles.panicButtonText}>EMERGENCY</Text>
                      <Text style={styles.panicButtonSubtext}>
                        {isActivating ? 'Hold to Activate' : 'Press and Hold'}
                      </Text>
                    </View>
                  </View>
                </View>
              </LongPressGestureHandler>
            )
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButton1]} 
            onPress={handleCallAdmin}
          >
            <Text style={styles.actionButtonText}>Call Admin</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButton2]} 
            onPress={handleFireEmergency}
          >
            <Text style={styles.actionButtonText}>Fire Emergency</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButton3]} 
            onPress={handleMedicalEmergency}
          >
            <Text style={styles.actionButtonText}>Medical Emergency</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeGuidance && (
        <GuidanceScreen
          title={GUIDANCE_DATA[activeGuidance].title}
          guidance={GUIDANCE_DATA[activeGuidance].guidance}
          onClose={closeGuidance}
          type={activeGuidance}
          userName={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown Teacher'}
          userRoom={user?.room}
        />
      )}
    </View>
  );

  useEffect(() => {
    // Set up notification handlers
    const cleanup = PushNotificationService.setupNotificationHandlers((type) => {
      if (type === 'lockdown') {
        setIsEmergencyActive(true);
      }
    });

    return cleanup;
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {isAuthenticated ? (
        <>
          {renderContent()}

          <CustomModal
            visible={!!modalConfig}
            title={modalConfig?.title || ''}
            message={modalConfig?.message || ''}
            buttons={modalConfig?.buttons || []}
            onClose={hideModal}
          />

          {isEmergencyActive && !isEmergencyMinimized && (
            <EmergencyActivatedScreen 
              onMinimize={handleEmergencyMinimize}
              onCancel={resetEmergencyState}
            />
          )}

          {showUserProfile && (
            <UserScreen onClose={handleCloseUserProfile} />
          )}
        </>
      ) : (
        <LoginScreen />
      )}
    </View>
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  guidanceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 15,
    flex: 1,
  },
  guidanceScroll: {
    maxHeight: '70%',
  },
  guidanceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
  },
  guidanceItemNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  guidanceItemNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  guidanceText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    flex: 1,
  },
  guidanceActions: {
    marginTop: 20,
    gap: 10,
  },
  guidanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    gap: 8,
  },
  guidanceDispatchButton: {
    backgroundColor: '#2196F3',
  },
  guidanceCloseButton: {
    backgroundColor: '#333333',
  },
  guidanceButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  guidanceCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dispatchConfirmModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  dispatchConfirmIconContainer: {
    marginBottom: 8,
  },
  dispatchConfirmTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
    textAlign: 'center',
  },
  dispatchConfirmMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 22,
  },
  dispatchConfirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    elevation: 2,
  },
  dispatchConfirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
}); 