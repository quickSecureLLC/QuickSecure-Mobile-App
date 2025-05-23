import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { API_BASE_URL, getApiUrl } from '../config/api';
import { SecureStorage } from './SecureStorage';

const TOKEN_KEY = 'qs_token';

export interface User {
  id: number;
  username: string;
  role: string;
  profileImage?: string;
}

interface LoginResponse {
  success: boolean;
  user: User;
}

interface ApiError {
  message: string;
  code?: string;
}

export class AuthService {
  private static async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error reading token:', error);
      return null;
    }
  }

  private static async handleApiError(error: any): Promise<never> {
    let message = 'An unexpected error occurred';
    
    if (error.response) {
      // Handle specific HTTP error responses
      switch (error.response.status) {
        case 401:
          message = 'Invalid username or password';
          await this.logout(); // Clear invalid token
          break;
        case 403:
          message = 'Access denied';
          break;
        case 422:
          message = 'Please check your input and try again';
          break;
        case 500:
          message = 'Server error. Please try again later';
          break;
      }
    } else if (error.message) {
      message = error.message;
    }

    throw new Error(message);
  }

  static async login(username: string, password: string, shouldStoreCredentials: boolean = true): Promise<LoginResponse> {
    try {
      const response = await fetch(getApiUrl('login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json() as ApiError;
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json() as LoginResponse;
      if (data.success) {
        // Store user data in AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        // Store credentials if requested
        if (shouldStoreCredentials) {
          await SecureStorage.storeCredentials(username, password);
        }
        
        return data;
      }
      throw new Error('Login failed');
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  static async loginWithBiometrics(): Promise<LoginResponse | null> {
    try {
      const success = await SecureStorage.authenticateWithBiometrics();
      if (!success) {
        return null;
      }

      const credentials = await SecureStorage.getCredentials();
      if (!credentials) {
        return null;
      }

      // Login with stored credentials but don't store them again
      return this.login(credentials.username, credentials.password, false);
    } catch (error) {
      console.error('Error during biometric login:', error);
      return null;
    }
  }

  static async getUserProfile(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  static async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, 'user']);
      // Don't clear stored credentials - we want to keep them for next login
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  static async checkAuth(): Promise<{ isAuthenticated: boolean; user: User | null }> {
    try {
      const user = await this.getUserProfile();
      if (!user) {
        // Try biometric login if credentials are stored
        const biometricResult = await this.loginWithBiometrics();
        if (biometricResult?.success) {
          return { 
            isAuthenticated: true, 
            user: biometricResult.user 
          };
        }
      }
      return { 
        isAuthenticated: !!user, 
        user 
      };
    } catch (error) {
      await this.logout();
      return { isAuthenticated: false, user: null };
    }
  }

  // Helper method to get auth headers for other services
  static async getAuthHeaders(): Promise<HeadersInit> {
    const user = await this.getUserProfile();
    return {
      'Content-Type': 'application/json',
      ...(user ? { 'Authorization': `Bearer ${user.id}` } : {}),
    };
  }
} 