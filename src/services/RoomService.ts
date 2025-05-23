import { Alert } from 'react-native';
import { AuthService } from './AuthService';

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

const API_BASE_URL = 'http://10.10.0.124:3002/api';
const CACHE_DURATION = 10000; // 10 seconds

export class RoomService {
  private static cache: {
    rooms?: RoomResponse;
    timestamp?: number;
  } = {};

  private static async getHeaders(): Promise<HeadersInit> {
    const token = await AuthService.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
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
      // Return cached data if valid
      if (this.isCacheValid()) {
        return this.cache.rooms!;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}/rooms`, {
        headers: await this.getHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      await this.handleResponse(response);

      if (!response.ok) {
        throw new APIError('Failed to fetch room statuses');
      }

      const data = await response.json();
      
      // Update cache
      this.cache = {
        rooms: data,
        timestamp: Date.now()
      };

      return data;
    } catch (error: unknown) {
      console.error('Error fetching room statuses:', error);
      
      if (error instanceof APIError && error.message !== 'Authentication required') {
        Alert.alert('Error', 'Failed to fetch room statuses');
      }

      // Return cached data if available, even if expired
      if (this.cache.rooms) {
        return this.cache.rooms;
      }

      // Return default data as last resort
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${API_BASE_URL}/rooms/${roomName}`,
        {
          method: 'PUT',
          headers: await this.getHeaders(),
          body: JSON.stringify({ status }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      await this.handleResponse(response);
      
      if (!response.ok) {
        throw new APIError('Failed to update room status');
      }

      // Invalidate cache
      this.cache = {};
      
      return true;
    } catch (error: unknown) {
      console.error('Error updating room status:', error);
      if (error instanceof APIError && error.message !== 'Authentication required') {
        Alert.alert('Error', 'Failed to update room status');
      }
      return false;
    }
  }

  static async triggerEmergencyAction(actionType: 'lockdown' | 'fireEvac' | 'medical'): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${API_BASE_URL}/emergency/${actionType}`,
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
      console.error(`Error triggering ${actionType}:`, error);
      if (error instanceof APIError && error.message !== 'Authentication required') {
        Alert.alert('Error', `Failed to trigger ${actionType}`);
      }
      return false;
    }
  }
} 