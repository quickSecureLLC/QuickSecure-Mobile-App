import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { 
  getApiUrl, 
  API_ENDPOINTS, 
  getRequestHeaders,
  API_CONFIG 
} from '../config/api';
import { SecureStorage } from './SecureStorage';
import { KeychainManager } from './KeychainManager';
import { NavigationService } from './NavigationService';
import { PushNotificationService } from './PushNotificationService';
import { 
  User, 
  LoginRequest, 
  LoginResponse, 
  RefreshRequest, 
  RefreshResponse, 
  ApiError 
} from '../types/auth';

const AUTH_TOKEN_KEY = 'qs_auth_token';
const REFRESH_TOKEN_KEY = 'qs_refresh_token';
const USER_KEY = 'qs_user';
const SCHOOL_CODE_KEY = 'qs_school_code';

export class AuthService {
  private static async getStoredToken(): Promise<string | null> {
    try {
      return await SecureStorage.getItemAsync(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error reading token:', error);
      return null;
    }
  }

  private static async getStoredRefreshToken(): Promise<string | null> {
    try {
      return await SecureStorage.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error reading refresh token:', error);
      return null;
    }
  }

  private static async handleApiError(error: any): Promise<never> {
    let message = 'An unexpected error occurred';
    let shouldLogout = false;
    
    if (error.response) {
      const { status, data } = error.response;
      const apiError = data as ApiError;
      
      switch (status) {
        case 400:
          if (apiError.code === 'MISSING_CREDENTIALS') {
            message = 'Please provide all required information';
          } else if (apiError.code === 'INVALID_SCHOOL_CODE') {
            message = 'Invalid school code. Please check and try again.';
          } else {
            message = apiError.error || 'Invalid request';
          }
          break;
        case 401:
          if (apiError.code === 'TOKEN_EXPIRED') {
            // Try to refresh token
            try {
              await this.refreshToken();
              throw new Error('Token refreshed, retry original request');
            } catch (refreshError) {
              shouldLogout = true;
              message = 'Session expired. Please log in again.';
            }
          } else if (apiError.code === 'INVALID_CREDENTIALS') {
            message = 'Invalid email or password';
          } else {
            message = 'Authentication failed';
            shouldLogout = true;
          }
          break;
        case 403:
          message = 'Access denied. Insufficient permissions.';
          break;
        case 429:
          message = 'Too many requests. Please try again later.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        case 503:
          message = 'Service temporarily unavailable. Please try again later.';
          break;
        default:
          message = apiError.error || `Server error (${status})`;
      }
    } else if (error.request) {
      message = 'Network error. Please check your connection.';
    } else {
      message = error.message || 'An unexpected error occurred';
    }

    if (shouldLogout) {
      await this.logout();
    }

    throw new Error(message);
  }

  static async login(email: string, password: string, schoolCode: string, shouldStoreCredentials: boolean = true): Promise<LoginResponse> {
    try {
      const requestBody: LoginRequest = {
        email,
        password,
        schoolCode
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(getApiUrl(API_ENDPOINTS.login), {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json() as ApiError;
        throw { response: { status: response.status, data: errorData } };
      }

      const data = await response.json() as LoginResponse;
      
      if (data.success && data.token) {
        // Store tokens securely
        await SecureStorage.setItemAsync(AUTH_TOKEN_KEY, data.token);
        await SecureStorage.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
        
        // Store user data
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
        await AsyncStorage.setItem(SCHOOL_CODE_KEY, schoolCode);
        
        // Store credentials if requested
        if (shouldStoreCredentials) {
          await SecureStorage.storeCredentials(email, password, schoolCode);
        }

        // Register for push notifications
        await PushNotificationService.registerForPushNotificationsAsync();
        
        return data;
      }
      
      throw new Error('Login failed - invalid response format');
    } catch (error) {
      console.error('Login error:', error);
      return await this.handleApiError(error);
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
      return this.login(credentials.email, credentials.password, credentials.schoolCode, false);
    } catch (error) {
      console.error('Error during biometric login:', error);
      return null;
    }
  }

  static async refreshToken(): Promise<RefreshResponse> {
    try {
      const refreshToken = await this.getStoredRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const requestBody: RefreshRequest = {
        refresh_token: refreshToken
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(getApiUrl(API_ENDPOINTS.refresh), {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json() as ApiError;
        throw { response: { status: response.status, data: errorData } };
      }

      const data = await response.json() as RefreshResponse;
      
      if (data.success && data.token) {
        // Update stored tokens
        await SecureStorage.setItemAsync(AUTH_TOKEN_KEY, data.token);
        await SecureStorage.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
        return data;
      }
      
      throw new Error('Token refresh failed - invalid response format');
    } catch (error) {
      console.error('Token refresh error:', error);
      return await this.handleApiError(error);
    }
  }

  static async getUserProfile(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  static async logout(): Promise<void> {
    try {
      // Clear user data
      await AsyncStorage.multiRemove([USER_KEY, SCHOOL_CODE_KEY]);
      
      // Clear tokens
      await SecureStorage.removeItemAsync(AUTH_TOKEN_KEY);
      await SecureStorage.removeItemAsync(REFRESH_TOKEN_KEY);
      
      // Clear stored credentials
      await SecureStorage.clearStoredCredentials();

      // Remove push token from server
      try {
        await PushNotificationService.removeDeviceToken();
      } catch (error) {
        console.error('Error removing push token:', error);
      }
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  static async checkAuth(): Promise<{ isAuthenticated: boolean; user: User | null }> {
    try {
      const [user, token] = await Promise.all([
        this.getUserProfile(),
        this.getStoredToken()
      ]);

      if (!user || !token) {
        // Try biometric login if credentials are stored
        const biometricResult = await this.loginWithBiometrics();
        if (biometricResult?.success) {
          return { 
            isAuthenticated: true, 
            user: biometricResult.user 
          };
        }
        return { isAuthenticated: false, user: null };
      }

      return { 
        isAuthenticated: true, 
        user 
      };
    } catch (error) {
      console.error('Error checking auth:', error);
      await this.logout();
      return { isAuthenticated: false, user: null };
    }
  }

  // Helper method to get auth headers for other services
  static async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getStoredToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    return getRequestHeaders(token);
  }

  // Helper method to check if user can create alerts
  static async canCreateAlerts(): Promise<boolean> {
    try {
      const user = await this.getUserProfile();
      return user ? ['admin', 'super_admin'].includes(user.role) : false;
    } catch (error) {
      console.error('Error checking alert permissions:', error);
      return false;
    }
  }
} 