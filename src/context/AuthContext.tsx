import React, { createContext, useState, useContext, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string;
  userEmail: string;
  phoneNumber: string;
  isBiometricEnabled: boolean;
  isLoading: boolean;
  login: (phoneNumber: string) => Promise<boolean>;
  logout: () => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('Teacher');
  const [userEmail, setUserEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  useEffect(() => {
    checkBiometricSettings();
    checkExistingSession();
  }, []);

  const checkBiometricSettings = async () => {
    try {
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      setIsBiometricEnabled(biometricEnabled === 'true');

      if (biometricEnabled === 'true') {
        const isAvailable = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (!isAvailable || !isEnrolled) {
          await AsyncStorage.setItem('biometricEnabled', 'false');
          setIsBiometricEnabled(false);
        }
      }
    } catch (error) {
      console.error('Error checking biometric settings:', error);
    }
  };

  const checkExistingSession = async () => {
    try {
      const savedPhoneNumber = await AsyncStorage.getItem('phoneNumber');
      const savedUserRole = await AsyncStorage.getItem('userRole');
      const savedUserEmail = await AsyncStorage.getItem('userEmail');

      if (savedPhoneNumber) {
        setPhoneNumber(savedPhoneNumber);
        setUserRole(savedUserRole || 'Teacher');
        setUserEmail(savedUserEmail || '');

        if (isBiometricEnabled) {
          await authenticateWithBiometric();
        }
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access QuickSecure',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Phone Number'
      });

      if (result.success) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const login = async (inputPhoneNumber: string): Promise<boolean> => {
    try {
      // Here you would typically validate the phone number with your backend
      // For now, we'll just check if it's a valid format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(inputPhoneNumber)) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
        return false;
      }

      // Store the phone number
      await AsyncStorage.setItem('phoneNumber', inputPhoneNumber);
      setPhoneNumber(inputPhoneNumber);

      // Mock user data - in real app, this would come from your backend
      const mockUserRole = 'Teacher';
      const mockUserEmail = 'teacher@school.edu';
      
      await AsyncStorage.setItem('userRole', mockUserRole);
      await AsyncStorage.setItem('userEmail', mockUserEmail);
      
      setUserRole(mockUserRole);
      setUserEmail(mockUserEmail);
      setIsAuthenticated(true);
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', 'Please try again');
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['phoneNumber', 'userRole', 'userEmail']);
      setIsAuthenticated(false);
      setPhoneNumber('');
      setUserRole('');
      setUserEmail('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const setBiometricEnabled = async (enabled: boolean) => {
    try {
      if (enabled) {
        const isAvailable = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (!isAvailable || !isEnrolled) {
          Alert.alert(
            'Biometric Not Available',
            'Please set up biometric authentication in your device settings first.'
          );
          return;
        }
      }
      
      await AsyncStorage.setItem('biometricEnabled', enabled.toString());
      setIsBiometricEnabled(enabled);
    } catch (error) {
      console.error('Error setting biometric:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userEmail,
        phoneNumber,
        isBiometricEnabled,
        isLoading,
        login,
        logout,
        setBiometricEnabled,
        authenticateWithBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 