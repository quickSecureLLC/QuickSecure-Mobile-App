import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationService } from './LocationService';
import { getApiUrl, API_ENDPOINTS, getRequestHeaders, API_CONFIG } from '../config/api';
import { AuthService } from './AuthService';
import { NavigationService } from './NavigationService';
import { AppLog } from '../utils/logger';

const QUEUED_ALERTS_KEY = 'qs_queued_alerts';
const LAST_ALERT_TIME_KEY = 'qs_last_alert_time';
const ALERT_COOLDOWN_MS = 5000; // 5 seconds
const RETRY_INTERVAL_MS = 30000; // 30 seconds

interface AlertPayload {
  type: 'emergency' | 'lockdown' | 'medical' | 'fire' | 'admin support';
  details: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  timestamp: number;
}

interface EmergencyResponse {
  success: boolean;
  message: string;
  alert?: {
    id: number;
    type: string;
    details: string;
    priority: string;
    location?: string;
    created_at: string;
    created_by: {
      user_id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
  push_notifications_sent?: number;
  processing_time_ms?: number;
}

interface ApiError {
  error: string;
  code?: string;
  details?: any;
  retry_after?: string;
}

class EmergencyService {
  private static retryTimeoutId: NodeJS.Timeout | null = null;

  static async canTriggerAlert(): Promise<boolean> {
    try {
      const lastAlertTime = await AsyncStorage.getItem(LAST_ALERT_TIME_KEY);
      if (!lastAlertTime) return true;

      const timeSinceLastAlert = Date.now() - parseInt(lastAlertTime, 10);
      return timeSinceLastAlert > ALERT_COOLDOWN_MS;
    } catch (error) {
      AppLog.error('Error checking alert cooldown:', error);
      return true; // Default to allowing alert if storage fails
    }
  }

  private static async handleErrorResponse(response: Response): Promise<never> {
    try {
      const errorData = await response.json() as ApiError;
      throw new Error(errorData.error || errorData.details || 'Server error');
    } catch (e) {
      throw new Error(`Server error (${response.status})`);
    }
  }

  static async postEmergencyAlert(
    teacherName: string,
    type: string = 'emergency',
    details: string = ''
  ): Promise<any> {
    try {
      // Allowed alert types (must match backend exactly)
      const allowedTypes = [
        'emergency', 'lockdown', 'fire', 'medical', 'admin support',
        'warning', 'info', 'maintenance', 'evacuation', 'all-clear'
      ];
      // Normalize and validate type
      type = (type || '').trim().toLowerCase();
      if (type === 'admin_support' || type === 'admin-support') type = 'admin support';
      if (!allowedTypes.includes(type)) {
        throw new Error(`Invalid alert type: '${type}'. Allowed types: ${allowedTypes.join(', ')}`);
      }

      // Check if user can create alerts
      const canCreate = await AuthService.canCreateAlerts();
      if (!canCreate) {
        throw new Error('Insufficient permissions to create alerts');
      }

      // Check cooldown
      if (!(await this.canTriggerAlert())) {
        throw new Error('Please wait before sending another alert');
      }

      // Get fresh location for emergency scenarios - NO CACHING
      let coordinates = undefined;
      try {
        // Use the production-ready emergency GPS function - NO CACHING WHATSOEVER
        const loc = await LocationService.getEmergencyGPS();
        if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
          // Validate GPS quality
          const validation = await LocationService.validateLocationAccuracy(loc);

          coordinates = {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            timestamp: loc.timestamp
          };

          AppLog.info('=== EMERGENCY ALERT GPS COORDINATES ===');
          AppLog.info('Coordinates:', JSON.stringify(coordinates, null, 2));
          AppLog.info('Quality:', validation.quality);
          AppLog.info('Valid:', validation.isValid);

          if (validation.isValid) {
            AppLog.info(`Emergency alert using fresh GPS (${validation.quality} quality):`, coordinates);
          } else {
            AppLog.warn(`Emergency alert using GPS with poor accuracy (${loc.accuracy}m):`, coordinates);
          }
        } else {
          AppLog.error('Emergency alert: No fresh GPS data available - alert will not be sent');
          throw new Error('Unable to get fresh GPS location for emergency alert');
        }
      } catch (e) {
        AppLog.error('GPS fetch failed for emergency alert:', e);
        throw new Error('Failed to get fresh GPS location. Please ensure location services are enabled and try again.');
      }

      const alertPayload: any = {
        type,
        details
      };
      if (coordinates) {
        alertPayload.coordinates = coordinates;
      }

      // Log outgoing payload for backend debugging
      AppLog.info('[QuickSecure] Posting alert:', JSON.stringify(alertPayload));

      // Always use /api/mobile/alerts
      const endpoint = 'mobile/alerts';
      const headers = await AuthService.getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers,
        body: JSON.stringify(alertPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Log response for debugging
      const responseText = await response.clone().text();
      AppLog.info('[QuickSecure] Alert response:', response.status, responseText);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('API endpoint not found (404). Please check your backend URL and endpoint.');
        }
        if (response.status === 400) {
          let err;
          try { err = JSON.parse(responseText); } catch { err = {}; }
          throw new Error(`Bad request (400): ${err.error || err.details || 'Invalid payload.'}`);
        }
        if (response.status === 403) {
          throw new Error('Insufficient permissions to create this alert (403 Forbidden).');
        }
        await this.handleErrorResponse(response);
      }

      const data = JSON.parse(responseText);
      await AsyncStorage.setItem(LAST_ALERT_TIME_KEY, Date.now().toString());
      
      // Return the response with GPS coordinates included
      return {
        ...data,
        gpsCoordinates: coordinates ? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracy: coordinates.accuracy,
          timestamp: coordinates.timestamp
        } : null
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to post emergency';
      AppLog.error('Emergency response error:', error);
      throw new Error(message);
    }
  }

  static async getLatestAlert(): Promise<EmergencyResponse | null> {
    try {
      const headers = await AuthService.getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(getApiUrl(API_ENDPOINTS.latestAlert), {
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No alerts found
        }
        await this.handleErrorResponse(response);
      }

      const data = await response.json() as EmergencyResponse;
      return data.alert ? data : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get latest alert';
      AppLog.error('Get latest alert error:', error);
      throw new Error(message);
    }
  }

  static async getAllAlerts(limit: number = 20, offset: number = 0): Promise<{
    alerts: any[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  }> {
    try {
      const headers = await AuthService.getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const url = `${getApiUrl(API_ENDPOINTS.alerts)}?limit=${limit}&offset=${offset}`;
      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get alerts';
      AppLog.error('Get alerts error:', error);
      throw new Error(message);
    }
  }

  static async queueOfflineAlert(payload: AlertPayload): Promise<void> {
    try {
      const queuedAlertsStr = await AsyncStorage.getItem(QUEUED_ALERTS_KEY);
      const queuedAlerts: AlertPayload[] = queuedAlertsStr ? JSON.parse(queuedAlertsStr) : [];
      
      // Add new alert to queue
      queuedAlerts.push(payload);
      
      // Keep only last 10 alerts in queue
      if (queuedAlerts.length > 10) {
        queuedAlerts.splice(0, queuedAlerts.length - 10);
      }
      
      await AsyncStorage.setItem(QUEUED_ALERTS_KEY, JSON.stringify(queuedAlerts));
      AppLog.info('Alert queued for retry:', payload);
    } catch (error) {
      AppLog.error('Error queuing offline alert:', error);
    }
  }

  static async retryQueuedAlerts(): Promise<void> {
    try {
      const queuedAlertsStr = await AsyncStorage.getItem(QUEUED_ALERTS_KEY);
      if (!queuedAlertsStr) return;

      const queuedAlerts: AlertPayload[] = JSON.parse(queuedAlertsStr);
      if (queuedAlerts.length === 0) return;

      let headers;
      try {
        headers = await AuthService.getAuthHeaders();
      } catch (error) {
        AppLog.error('Authentication failed during retry:', error);
        return; // Will try again on next retry interval
      }

      const successfulAlerts: number[] = [];

      // Try to send each queued alert
      await Promise.all(queuedAlerts.map(async (alert: AlertPayload, index: number) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(getApiUrl(API_ENDPOINTS.alerts), {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: JSON.stringify(alert)
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            successfulAlerts.push(index);
          } else {
            AppLog.error(`Failed to retry alert ${index}:`, response.status);
          }
        } catch (error) {
          AppLog.error(`Error retrying alert ${index}:`, error);
        }
      }));

      // Remove successful alerts from queue
      if (successfulAlerts.length > 0) {
        const remainingAlerts = queuedAlerts.filter((_, index) => !successfulAlerts.includes(index));
        await AsyncStorage.setItem(QUEUED_ALERTS_KEY, JSON.stringify(remainingAlerts));
        AppLog.info(`Successfully retried ${successfulAlerts.length} alerts`);
      }
    } catch (error) {
      AppLog.error('Error during alert retry process:', error);
    }
  }

  static startRetryProcess(): void {
    if (this.retryTimeoutId) {
      clearInterval(this.retryTimeoutId);
    }
    
    this.retryTimeoutId = setInterval(() => {
      this.retryQueuedAlerts();
    }, RETRY_INTERVAL_MS);
  }

  static stopRetryProcess(): void {
    if (this.retryTimeoutId) {
      clearInterval(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  static async cancelEmergency(): Promise<void> {
    try {
      const headers = await AuthService.getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
      const response = await fetch(getApiUrl('emergency/cancel'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ timestamp: Date.now() }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error('Failed to cancel emergency');
      }
    } catch (error) {
      AppLog.error('Error canceling emergency:', error);
      throw error;
    }
  }
}

export { EmergencyService }; 