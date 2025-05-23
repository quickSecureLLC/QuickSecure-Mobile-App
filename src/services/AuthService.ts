import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export interface LoginResponse {
  success: boolean;
  role: string;
  token: string;
  expires_at: string;
}

const API_BASE_URL = 'http://10.10.0.124:3002/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class AuthService {
  private static async retryOperation<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  static async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await this.retryOperation(() => 
        fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            password,
            client_type: 'ios_app'
          })
        })
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }

      const data: LoginResponse = await response.json();
      if (data.success && data.token) {
        await Promise.all([
          SecureStore.setItemAsync('auth_token', data.token),
          SecureStore.setItemAsync('user_role', data.role),
          SecureStore.setItemAsync('token_expiry', data.expires_at)
        ]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert(
        'Login Error',
        error instanceof Error ? error.message : 'Please check your network connection and try again.'
      );
      return false;
    }
  }

  static async logout(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('auth_token'),
        SecureStore.deleteItemAsync('user_role'),
        SecureStore.deleteItemAsync('token_expiry')
      ]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  static async getAuthToken(): Promise<string | null> {
    try {
      const [token, expiry] = await Promise.all([
        SecureStore.getItemAsync('auth_token'),
        SecureStore.getItemAsync('token_expiry')
      ]);
      
      if (!token || !expiry) {
        return null;
      }

      // Check if token is expired
      if (new Date(expiry) <= new Date()) {
        await this.logout();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  static async getUserRole(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('user_role');
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }
} 