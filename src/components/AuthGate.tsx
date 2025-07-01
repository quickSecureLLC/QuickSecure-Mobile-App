import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppLog } from '../utils/logger';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authFailed, setAuthFailed] = useState(false);

  const authenticate = async () => {
    setIsAuthenticating(true);
    setAuthFailed(false);
    
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock QuickSecure',
        disableDeviceFallback: false,   // show Apple passcode sheet
        requireConfirmation: false,     // no secondary "OK" tap
        fallbackLabel: '',              // empty string hides biometric button
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        setIsAuthenticated(true);
      } else {
        setAuthFailed(true);
      }
    } catch (error) {
      AppLog.error('Authentication error:', error);
      setAuthFailed(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  useEffect(() => {
    let backgroundTimer: NodeJS.Timeout | null = null;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Start timer when app goes to background
        backgroundTimer = setTimeout(() => {
          setIsAuthenticated(false);
          setAuthFailed(false);
          setIsAuthenticating(true);
        }, 1000);
      } else if (nextAppState === 'active' && backgroundTimer) {
        // Clear timer if app becomes active before 1 second
        clearTimeout(backgroundTimer);
        backgroundTimer = null;
        
        // If we were unauthenticated, trigger authentication
        if (!isAuthenticated) {
          authenticate();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }
      subscription.remove();
    };
  }, [isAuthenticated]);

  if (isAuthenticating) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (authFailed) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={authenticate}
        >
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  retryButton: {
    padding: 20,
    backgroundColor: '#333333',
    borderRadius: 10,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 