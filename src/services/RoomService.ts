import { Alert } from 'react-native';
import { AuthService } from './AuthService';
import { API_BASE_URL, getApiUrl } from '../config/api';
import { AppLog } from '../utils/logger';

export type RoomStatus = 'Locked' | 'Unlocked' | 'Unsafe';

export interface Room {
  name: string;
  status: RoomStatus;
}

export interface RoomStats {
  locked: number;
  safeHavens: number;
  unlocked: number;
}

export interface RoomResponse {
  rooms: Room[];
  stats: RoomStats;
}

export class APIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'APIError';
  }
}

const CACHE_DURATION = 10000; // 10 seconds

export class RoomService {
  private static cache: {
    rooms?: RoomResponse;
    timestamp?: number;
  } = {};

  private static async getHeaders(): Promise<HeadersInit> {
    const user = await AuthService.getUserProfile();
    return {
      'Content-Type': 'application/json',
      'Authorization': user ? `Bearer ${user.id}` : ''
    };
  }

  private static async handleResponse(response: Response) {
    if (response.status === 401) {
      await AuthService.logout();
      Alert.alert('Session Expired', 'Please log in again');
      throw new APIError('Authentication required');
    }
    return response;
  }

  private static isCacheValid(): boolean {
    return !!(
      this.cache.rooms &&
      this.cache.timestamp &&
      Date.now() - this.cache.timestamp < CACHE_DURATION
    );
  }

  static async getRoomStatuses(): Promise<RoomResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(getApiUrl('rooms'), {
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          await AuthService.logout();
          throw new Error('Session expired. Please login again');
        }
        throw new Error('Failed to fetch room statuses');
      }

      return await response.json();
    } catch (error) {
      AppLog.error('Error fetching room statuses:', error);
      // Fallback data provided if API fails
      return {
        rooms: [
          { name: 'Gym', status: 'Locked' },
          { name: 'Office 6', status: 'Unsafe' },
          { name: 'S2', status: 'Unsafe' },
          { name: 'Cafeteria', status: 'Locked' }
        ],
        stats: {
          locked: 11,
          safeHavens: 3,
          unlocked: 3
        }
      };
    }
  }

  static async updateRoomStatus(roomName: string, status: RoomStatus): Promise<boolean> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        getApiUrl(`rooms/${roomName}`),
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status })
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          await AuthService.logout();
          throw new Error('Session expired. Please login again');
        }
        throw new Error('Failed to update room status');
      }
      
      return true;
    } catch (error) {
      AppLog.error('Error updating room status:', error);
      return false;
    }
  }

  static async triggerEmergencyAction(actionType: 'lockdown' | 'fireEvac' | 'medical'): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        getApiUrl(`emergency/${actionType}`),
        {
          method: 'POST',
          headers: await this.getHeaders(),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      await this.handleResponse(response);
      
      if (!response.ok) {
        throw new APIError(`Failed to trigger ${actionType}`);
      }

      // Invalidate cache as emergency action might change room statuses
      this.cache = {};
      
      return true;
    } catch (error: unknown) {
      AppLog.error(`Error triggering ${actionType}:`, error);
      if (error instanceof APIError && error.message !== 'Authentication required') {
        Alert.alert('Error', `Failed to trigger ${actionType}`);
      }
      return false;
    }
  }
} 