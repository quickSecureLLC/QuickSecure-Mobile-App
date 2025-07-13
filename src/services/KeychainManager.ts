import * as SecureStore from 'expo-secure-store';
import { AppLog } from '../utils/logger';

const TOKEN_KEY = 'qs_auth_token';

class KeychainManager {
  static async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      AppLog.error('Error getting token:', error);
      return null;
    }
  }

  static async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, typeof token === 'string' ? token : JSON.stringify(token));
    } catch (error) {
      AppLog.error('Error setting token:', error);
    }
  }

  static async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      AppLog.error('Error removing token:', error);
    }
  }
}

export { KeychainManager }; 