import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Input, Button, Text, Icon } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/AuthService';
import { QuickSecureLogo } from '../components/QuickSecureLogo';
import { SecureStorage } from '../services/SecureStorage';
import * as LocalAuthentication from 'expo-local-authentication';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const hasStoredCredentials = !!(await SecureStorage.getCredentials());
      setBiometricsAvailable(hasHardware && isEnrolled && hasStoredCredentials);
      
      // If biometrics are available, try to authenticate immediately
      if (hasHardware && isEnrolled && hasStoredCredentials) {
        handleBiometricAuth();
      }
    } catch (error) {
      console.error('Error checking biometrics:', error);
    }
  };

  const validateInput = () => {
    if (!email || !password || !schoolCode) {
      Alert.alert('Error', 'Please enter email, password, and school code');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    // School code validation (6 alphanumeric characters)
    if (schoolCode.length !== 6 || !/^[A-Z0-9]{6}$/.test(schoolCode)) {
      Alert.alert('Error', 'School code must be 6 alphanumeric characters');
      return false;
    }
    
    return true;
  };

  const handleLogin = async () => {
    if (!validateInput()) return;

    setIsLoading(true);
    try {
      const response = await AuthService.login(email, password, schoolCode);
      if (response.success) {
        await login(response.user);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Please check your credentials and try again'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    setIsLoading(true);
    try {
      const response = await AuthService.loginWithBiometrics();
      if (response?.success) {
        await login(response.user);
      } else {
        // If biometric auth fails, let user enter credentials manually
        Alert.alert(
          'Biometric Authentication Failed',
          'Please log in with your email, password, and school code'
        );
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.logoContainer}>
            <QuickSecureLogo width={120} height={120} color="#FFFFFF" />
            <Text h2 style={styles.title}>QuickSecure</Text>
            <Text style={styles.subtitle}>Teacher Safety System</Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              placeholder="Email"
              leftIcon={{ type: 'material', name: 'email', color: '#666' }}
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              disabled={isLoading}
            />

            <Input
              placeholder="Password"
              leftIcon={{ type: 'material', name: 'lock', color: '#666' }}
              onChangeText={setPassword}
              value={password}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              disabled={isLoading}
            />

            <Input
              placeholder="School Code (6 characters)"
              leftIcon={{ type: 'material', name: 'school', color: '#666' }}
              onChangeText={(text) => setSchoolCode(text.toUpperCase())}
              value={schoolCode}
              autoCapitalize="characters"
              maxLength={6}
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              disabled={isLoading}
            />

            <Button
              title={isLoading ? <ActivityIndicator color="#fff" /> : "Login"}
              onPress={handleLogin}
              disabled={isLoading}
              containerStyle={styles.buttonContainer}
              buttonStyle={styles.button}
            />

            {biometricsAvailable && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
                disabled={isLoading}
              >
                <Icon
                  name={Platform.OS === 'ios' ? 'face-id' : 'fingerprint'}
                  type={Platform.OS === 'ios' ? 'material-community' : 'material'}
                  color="#666"
                  size={24}
                />
                <Text style={styles.biometricText}>
                  {Platform.OS === 'ios' ? 'Use Face ID' : 'Use Fingerprint'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.helpText}>
            Enter your credentials to access the app
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    color: '#fff',
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
  },
  button: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  biometricText: {
    color: '#666',
    marginLeft: 10,
    fontSize: 16,
  },
  helpText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
}); 