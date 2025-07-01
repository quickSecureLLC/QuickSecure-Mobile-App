import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  Linking,
  PanResponder,
  BackHandler,
} from 'react-native';
import { Text, Button, Icon } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import { EmergencyService } from '../services/EmergencyService';
import { AuthService } from '../services/AuthService';
import { QuickSecureLogo } from '../components/QuickSecureLogo';
import { AppLog } from '../utils/logger';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.7;
const HOLD_DURATION = 3000; // 3 seconds for hold-to-activate
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const HomeScreen = () => {
  const { logout, user } = useAuth();
  const [drawerAnimation] = useState(new Animated.Value(-DRAWER_WIDTH));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [canCreateAlerts, setCanCreateAlerts] = useState(false);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const emergencyScale = useRef(new Animated.Value(1)).current;
  const backgroundPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkUserPermissions();
    // Start retry process for offline alerts
    EmergencyService.startRetryProcess();
    
    return () => {
      EmergencyService.stopRetryProcess();
    };
  }, []);

  const checkUserPermissions = async () => {
    try {
      const canCreate = await AuthService.canCreateAlerts();
      setCanCreateAlerts(canCreate);
    } catch (error) {
      AppLog.error('Error checking user permissions:', error);
      setCanCreateAlerts(false);
    }
  };

  const toggleDrawer = () => {
    const toValue = isDrawerOpen ? -DRAWER_WIDTH : 0;
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'Are you sure you want to call 911?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call 911',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('tel:911');
          }
        }
      ]
    );
  };

  const handleCallAdmin = async () => {
    if (!canCreateAlerts) {
      Alert.alert('Permission Denied', 'You do not have permission to create alerts.');
      return;
    }
    try {
      const response = await EmergencyService.postEmergencyAlert(
        user ? `${user.first_name} ${user.last_name}` : 'Unknown User',
        'admin support',
        'Admin assistance needed in main office'
      );
      if (response.success) {
        Alert.alert('Admin Support', 'Admin support alert sent successfully.');
      } else {
        throw new Error('Failed to send admin support alert');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send admin support alert');
    }
  };

  const handleEmergencyAction = async (actionType: 'fire' | 'medical' | 'admin support') => {
    if (!canCreateAlerts) {
      Alert.alert('Permission Denied', 'You do not have permission to create alerts.');
      return;
    }

    try {
      let details = '';
      let priority: 'high' | 'critical' = 'high';
      
      switch (actionType) {
        case 'fire':
          details = 'Fire emergency reported - evacuate immediately';
          priority = 'critical';
          break;
        case 'medical':
          details = 'Medical emergency - immediate assistance needed';
          priority = 'high';
          break;
        case 'admin support':
          details = 'Administrative support requested';
          priority = 'high';
          break;
      }

      const response = await EmergencyService.postEmergencyAlert(
        user ? `${user.first_name} ${user.last_name}` : 'Unknown Teacher'
      );

      if (response.success) {
        Alert.alert('Success', `${actionType} alert has been sent successfully`);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to send emergency alert'
      );
    }
  };

  // Emergency button hold animation
  const startHoldAnimation = () => {
    if (!canCreateAlerts) {
      Alert.alert('Permission Denied', 'You do not have permission to create emergency alerts.');
      return;
    }

    setIsHolding(true);
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        activateEmergency();
      }
    });
  };

  const stopHoldAnimation = () => {
    setIsHolding(false);
    holdProgress.setValue(0);
    Animated.spring(emergencyScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const activateEmergency = async () => {
    try {
      const response = await EmergencyService.postEmergencyAlert(
        user ? `${user.first_name} ${user.last_name}` : 'Unknown Teacher'
      );

      if (response.success) {
        setIsEmergencyActive(true);
        startBackgroundPulse();
        Alert.alert(
          'Emergency Alert Sent',
          'Help is on the way. Stay calm and follow safety procedures.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to send emergency alert'
      );
      stopHoldAnimation();
    }
  };

  const startBackgroundPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundPulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const deactivateEmergency = () => {
    setIsEmergencyActive(false);
    backgroundPulse.setValue(0);
    stopHoldAnimation();
  };

  // Handle back button during emergency
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isEmergencyActive) {
        deactivateEmergency();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isEmergencyActive]);

  return (
    <View style={styles.container}>
      {/* Header with updated layout */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <QuickSecureLogo width={24} height={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>QuickSecure</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.profileButton}>
            <Icon name="person" type="material" size={24} color="#fff" />
          </TouchableOpacity>
        <TouchableOpacity onPress={toggleDrawer}>
          <Icon name="menu" type="material" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
          </View>

      {isEmergencyActive ? (
        // Emergency Active State
        <Animated.View 
          style={[
            styles.emergencyActiveContainer,
            {
              opacity: backgroundPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ]}
        >
          <Text style={styles.emergencyActiveText}>
            EMERGENCY ALERT ACTIVATED
          </Text>
          <Text style={styles.emergencySubtext}>
            Help is on the way
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={deactivateEmergency}
          >
            <Text style={styles.cancelButtonText}>Cancel Emergency</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        // Normal View
        <>
          {/* Emergency Button */}
          <TouchableOpacity
            onPressIn={startHoldAnimation}
            onPressOut={stopHoldAnimation}
            activeOpacity={0.8}
            disabled={!canCreateAlerts}
          >
            <Animated.View
              style={[
                styles.emergencyButton,
                {
                  transform: [
                    { scale: emergencyScale },
                    {
                      scale: holdProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                  opacity: canCreateAlerts ? 1 : 0.5,
                },
              ]}
            >
              <Icon name="warning" type="material" size={48} color="#fff" />
              <Text style={styles.emergencyButtonText}>
                {isHolding ? 'HOLD TO ACTIVATE' : 'EMERGENCY'}
              </Text>
              <Animated.View
                style={[
                  styles.progressRing,
                  {
                    transform: [
                      {
                        scale: holdProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Quick Action Buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#4a4a4a' }]}
              onPress={handleCallAdmin}
            >
              <Icon name="phone" type="material" size={24} color="#fff" />
              <Text style={styles.quickActionText}>Call Admin</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#3a3a3a' }]}
              onPress={() => handleEmergencyAction('fire')}
              disabled={!canCreateAlerts}
            >
              <Icon name="local-fire-department" type="material" size={24} color="#fff" />
              <Text style={styles.quickActionText}>Fire Emergency</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#2a2a2a' }]}
              onPress={() => handleEmergencyAction('medical')}
              disabled={!canCreateAlerts}
            >
              <Icon name="medical-services" type="material" size={24} color="#fff" />
              <Text style={styles.quickActionText}>Medical Emergency</Text>
          </TouchableOpacity>
        </View>
        </>
      )}

      <ScrollView style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text h4 style={styles.welcomeText}>
            Welcome, {user?.first_name || user?.email || 'User'}
          </Text>
          <Text style={styles.subtitle}>
            {user?.school_name || 'School'} - {user?.role || 'User'}
          </Text>
        </View>

        {/* Emergency Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="warning" type="material" size={20} color="#e74c3c" />
            <Text style={styles.sectionTitle}>EMERGENCY ACTIONS</Text>
          </View>
          
          <Button
            title="911 Emergency"
            icon={<Icon name="phone" type="material" color="#fff" />}
            buttonStyle={[styles.emergencyButton, { backgroundColor: '#e74c3c' }]}
            onPress={handleEmergencyCall}
          />
          
          <Button
            title="Call Administrator"
            icon={<Icon name="phone" type="material" color="#fff" />}
            buttonStyle={[styles.emergencyButton, { backgroundColor: '#3498db' }]}
            onPress={handleCallAdmin}
          />

          {canCreateAlerts && (
            <Button
              title="Admin Support Request"
              icon={<Icon name="admin-panel-settings" type="material" color="#fff" />}
              buttonStyle={[styles.emergencyButton, { backgroundColor: '#9b59b6' }]}
              onPress={() => handleEmergencyAction('admin support')}
            />
          )}
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="info" type="material" size={20} color="#3498db" />
            <Text style={styles.sectionTitle}>USER INFORMATION</Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>Name: {user?.first_name} {user?.last_name}</Text>
            <Text style={styles.userInfoText}>Email: {user?.email}</Text>
            <Text style={styles.userInfoText}>Role: {user?.role}</Text>
            <Text style={styles.userInfoText}>School: {user?.school_name}</Text>
            {user?.room && <Text style={styles.userInfoText}>Room: {user.room}</Text>}
          </View>
        </View>
      </ScrollView>

      {/* Side Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: drawerAnimation }],
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text h4 style={styles.drawerTitle}>Menu</Text>
          <TouchableOpacity onPress={toggleDrawer}>
            <Icon name="close" type="material" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.drawerContent}>
          <TouchableOpacity style={styles.drawerItem}>
            <Icon name="dashboard" type="material" color="#2c3e50" />
            <Text style={styles.drawerItemText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerItem}>
            <Icon name="security" type="material" color="#2c3e50" />
            <Text style={styles.drawerItemText}>Security</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerItem}>
            <Icon name="settings" type="material" color="#2c3e50" />
            <Text style={styles.drawerItemText}>Settings</Text>
          </TouchableOpacity>

          <Button
            title="Logout"
            onPress={logout}
            containerStyle={styles.logoutButton}
            buttonStyle={{ backgroundColor: '#e74c3c' }}
          />
        </View>
      </Animated.View>

      {/* Overlay when drawer is open */}
      {isDrawerOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleDrawer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3498db',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerTime: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
  },
  threatBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e74c3c',
  },
  threatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threatText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  threatLocation: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  welcomeText: {
    color: '#2c3e50',
  },
  subtitle: {
    color: '#7f8c8d',
    marginTop: 5,
  },
  statsSection: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  statItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '30%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  emergencyButton: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 20,
    elevation: 5,
    overflow: 'hidden',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  progressRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: SCREEN_WIDTH * 0.4,
    borderWidth: 4,
    borderColor: '#fff',
  },
  emergencyActiveContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyActiveText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emergencySubtext: {
    color: '#fff',
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'column',
    padding: 20,
    gap: 10,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  warningTriangle: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  warningText: {
    color: '#e74c3c',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  warningLocation: {
    color: '#e74c3c',
    fontSize: 16,
    marginTop: 5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2c3e50',
  },
  drawerTitle: {
    color: '#fff',
  },
  drawerContent: {
    flex: 1,
    padding: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  drawerItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  logoutButton: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  listItemStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  stepsList: {
    marginTop: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3498db',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: '#7f8c8d',
    fontSize: 12,
    marginLeft: 4,
  },
  userInfo: {
    padding: 20,
  },
  userInfoText: {
    color: '#7f8c8d',
    fontSize: 16,
    marginBottom: 10,
  },
}); 