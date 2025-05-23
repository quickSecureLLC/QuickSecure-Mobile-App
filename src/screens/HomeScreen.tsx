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
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { RoomService, Room, RoomStats } from '../services/RoomService';
import { SvgUri } from 'react-native-svg';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.7;
const HOLD_DURATION = 3000; // 3 seconds for hold-to-activate
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const HomeScreen = () => {
  const { logout, userRole } = useAuth();
  const [drawerAnimation] = useState(new Animated.Value(-DRAWER_WIDTH));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeThreatLocation, setActiveThreatLocation] = useState<string | null>('South Stairs Area');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<RoomStats>({
    locked: 0,
    safeHavens: 0,
    unlocked: 0
  });
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const emergencyScale = useRef(new Animated.Value(1)).current;
  const warningTriangleScale = useRef(new Animated.Value(1)).current;
  const backgroundPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchRoomStatuses();
    // Refresh room statuses every 30 seconds
    const interval = setInterval(fetchRoomStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRoomStatuses = async () => {
    const response = await RoomService.getRoomStatuses();
    setRooms(response.rooms);
    setStats(response.stats);
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

  const handleSilentPanic = async () => {
    Alert.alert(
      'Silent Panic',
      'Are you sure you want to trigger a silent panic alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Trigger Alert',
          style: 'destructive',
          onPress: async () => {
            const success = await RoomService.triggerEmergencyAction('lockdown');
            if (success) {
              Alert.alert('Success', 'Silent panic alert has been triggered');
            }
          }
        }
      ]
    );
  };

  const handleCallAdmin = () => {
    // Replace with actual admin phone number
    Linking.openURL('tel:+1234567890');
  };

  const handleEmergencyAction = async (actionType: 'lockdown' | 'fireEvac' | 'medical') => {
    const success = await RoomService.triggerEmergencyAction(actionType);
    if (success) {
      Alert.alert('Success', `${actionType} procedure initiated`);
    }
  };

  const handleRoomStatusUpdate = async (roomName: string, newStatus: 'Locked' | 'Unlocked' | 'Unsafe') => {
    const success = await RoomService.updateRoomStatus(roomName, newStatus);
    if (success) {
      fetchRoomStatuses();
    }
  };

  // Emergency button hold animation
  const startHoldAnimation = () => {
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

  const activateEmergency = () => {
    setIsEmergencyActive(true);
    startBackgroundPulse();
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

  // Warning triangle animation
  useEffect(() => {
    if (activeThreatLocation) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(warningTriangleScale, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(warningTriangleScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      warningTriangleScale.setValue(1);
    }
  }, [activeThreatLocation]);

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
          <SvgUri
            width={24}
            height={24}
            uri={require('../../QuickSecure_Logo.svg')}
            fill="#fff"
          />
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
                },
              ]}
            >
              <BlurView intensity={isHolding ? 20 : 0} style={StyleSheet.absoluteFill} />
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
              onPress={() => handleEmergencyAction('fireEvac')}
            >
              <Icon name="local-fire-department" type="material" size={24} color="#fff" />
              <Text style={styles.quickActionText}>Fire Emergency</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#2a2a2a' }]}
              onPress={() => handleEmergencyAction('medical')}
            >
              <Icon name="medical-services" type="material" size={24} color="#fff" />
              <Text style={styles.quickActionText}>Medical Emergency</Text>
            </TouchableOpacity>
          </View>

          {/* Warning Triangle */}
          {activeThreatLocation && (
            <Animated.View
              style={[
                styles.warningTriangle,
                {
                  transform: [{ scale: warningTriangleScale }],
                },
              ]}
            >
              <Icon name="warning" type="material" size={64} color="#e74c3c" />
              <Text style={styles.warningText}>Active Threat</Text>
              <Text style={styles.warningLocation}>{activeThreatLocation}</Text>
            </Animated.View>
          )}
        </>
      )}

      <ScrollView style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text h4 style={styles.welcomeText}>Welcome, {userRole}</Text>
          <Text style={styles.subtitle}>Your security dashboard is ready</Text>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.locked}</Text>
            <Text style={styles.statLabel}>Rooms Locked</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.safeHavens}</Text>
            <Text style={styles.statLabel}>Safe Havens</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.unlocked}</Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>
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
            title="Silent Panic Alert"
            icon={<Icon name="warning" type="material" color="#fff" />}
            buttonStyle={[styles.emergencyButton, { backgroundColor: '#f39c12' }]}
            onPress={handleSilentPanic}
          />
          
          <Button
            title="Call Administrator"
            icon={<Icon name="phone" type="material" color="#fff" />}
            buttonStyle={[styles.emergencyButton, { backgroundColor: '#3498db' }]}
            onPress={handleCallAdmin}
          />
        </View>

        {/* Room Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="room" type="material" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>ROOM STATUS</Text>
          </View>
          
          {rooms.map((room, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.listItem}
              onPress={() => {
                Alert.alert(
                  'Update Room Status',
                  `Update status for ${room.name}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Lock', onPress: () => handleRoomStatusUpdate(room.name, 'Locked') },
                    { text: 'Unlock', onPress: () => handleRoomStatusUpdate(room.name, 'Unlocked') },
                    { text: 'Mark Unsafe', onPress: () => handleRoomStatusUpdate(room.name, 'Unsafe') }
                  ]
                );
              }}
            >
              <Text style={styles.listItemTitle}>{room.name}</Text>
              <Text style={[
                styles.listItemStatus,
                { color: room.status === 'Locked' ? '#27ae60' : 
                         room.status === 'Unlocked' ? '#f39c12' : '#e74c3c' }
              ]}>
                {room.status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Emergency Procedures */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="security" type="material" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>EMERGENCY PROCEDURES</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.listItem}
            onPress={() => handleEmergencyAction('lockdown')}
          >
            <View style={styles.listItemContent}>
              <Icon name="lock" type="material" size={24} color="#2c3e50" />
              <Text style={styles.listItemTitle}>Lockdown</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.listItem}
            onPress={() => handleEmergencyAction('fireEvac')}
          >
            <View style={styles.listItemContent}>
              <Icon name="local-fire-department" type="material" size={24} color="#2c3e50" />
              <Text style={styles.listItemTitle}>Fire Evac</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.listItem, { backgroundColor: '#3498db' }]}
            onPress={() => handleEmergencyAction('medical')}
          >
            <View style={styles.listItemContent}>
              <Icon name="medical-services" type="material" size={24} color="#fff" />
              <Text style={[styles.listItemTitle, { color: '#fff' }]}>Medical</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Medical Emergency Steps */}
        <View style={styles.section}>
          <Text style={styles.emergencyTitle}>Medical Emergency</Text>
          <View style={styles.stepsList}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Assess situation and call for help</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Provide first aid if trained</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Keep area clear</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>Document incident details</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>5</Text>
              <Text style={styles.stepText}>Follow up with administration</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Icon name="person" type="material" size={16} color="#7f8c8d" />
            <Text style={styles.footerText}>Teacher Mode</Text>
          </View>
          <Text style={styles.footerText}>v2.5.0</Text>
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
    paddingVertical: 12,
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
    fontSize: 16,
    fontWeight: '500',
  },
  emergencyTitle: {
    color: '#2c3e50',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stepsList: {
    padding: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumber: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  stepText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: '#7f8c8d',
    fontSize: 12,
  },
}); 