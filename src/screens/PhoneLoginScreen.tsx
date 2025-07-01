import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { Input, Button, Text } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/AuthService';

export const PhoneLoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      // For demo: use phoneNumber as email, and dummy password/schoolCode
      const response = await AuthService.login(phoneNumber, 'password', 'school', false);
      if (response && response.success && response.user) {
        await login(response.user);
      } else {
        Alert.alert('Login Failed', 'Please check your phone number and try again');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during login');
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
            <Text h2 style={styles.title}>QuickSecure</Text>
            <Text style={styles.subtitle}>Teacher Safety System</Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              placeholder="Phone Number"
              leftIcon={{ type: 'material', name: 'phone', color: '#666' }}
              onChangeText={setPhoneNumber}
              value={phoneNumber}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
            />

            <Button
              title="Login"
              onPress={handleLogin}
              loading={isLoading}
              containerStyle={styles.buttonContainer}
              buttonStyle={styles.button}
            />
          </View>

          <Text style={styles.helpText}>
            Enter your registered phone number to access the app
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
  helpText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
}); 