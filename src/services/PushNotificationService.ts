import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getApiUrl, API_ENDPOINTS, getRequestHeaders, API_CONFIG } from '../config/api';
import { AuthService } from './AuthService';
import { AppLog } from '../utils/logger';

export class PushNotificationService {
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    // Check if user is authenticated and has admin role
    const user = await AuthService.getUserProfile();
    const token = await AuthService.getStoredToken?.() || null;
    if (!user || !token) {
      AppLog.error('User not authenticated, cannot register for push notifications');
      return null;
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      AppLog.error('User does not have admin privileges, cannot register for push notifications');
      return null;
    }
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        AppLog.info('Failed to get push token for push notification!');
        return null;
      }

      // Get the token
      const expoPushToken = await Notifications.getExpoPushTokenAsync();

      // Register the token with our backend
      await this.registerDeviceToken(expoPushToken.data);

      return expoPushToken.data;
    } catch (error) {
      AppLog.error('Error registering for push notifications:', error);
      return null;
    }
  }

  static async registerDeviceToken(token: string): Promise<void> {
    try {
      const headers = await AuthService.getAuthHeaders();
      const response = await fetch(getApiUrl(API_ENDPOINTS.pushToken), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          app_version: '1.0.0'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Failed to register push token with server');
      }
    } catch (error) {
      AppLog.error('Error registering device token:', error);
      throw error;
    }
  }

  static async removeDeviceToken(): Promise<void> {
    // Check if user is authenticated and has admin role
    const user = await AuthService.getUserProfile();
    const token = await AuthService.getStoredToken?.() || null;
    if (!user || !token) {
      AppLog.error('User not authenticated, cannot remove device token');
      return;
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      AppLog.error('User does not have admin privileges, cannot remove device token');
      return;
    }
    try {
      const headers = await AuthService.getAuthHeaders();
      const response = await fetch(getApiUrl(API_ENDPOINTS.pushToken), {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Failed to remove push token from server');
      }
    } catch (error) {
      AppLog.error('Error removing device token:', error);
      throw error;
    }
  }

  static setupNotificationHandlers(onEmergencyNotification: (type: string) => void) {
    // Handler for when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      }),
    });

    // Handler for received notifications (foreground)
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as Record<string, any>;
      const alertType = data?.type || data?.alertType;
      if (alertType && typeof alertType === 'string') {
        onEmergencyNotification(alertType);
      }
    });

    // Handler for notification response (background/killed)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, any>;
      const alertType = data?.type || data?.alertType;
      if (alertType && typeof alertType === 'string') {
        onEmergencyNotification(alertType);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }
} 