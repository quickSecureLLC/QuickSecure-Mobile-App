import { SecureStorage } from '../services/SecureStorage';
import { AuthService } from '../services/AuthService';

const AUTH_TOKEN_KEY = 'qs_auth_token';

export class AuthHelper {
  static async getAuthHeaders(): Promise<{ Authorization: string; 'Content-Type': string }> {
    const token = await SecureStorage.getItemAsync(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('No auth token found in SecureStorage');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  static async silentRefresh(): Promise<boolean> {
    try {
      const credentials = await SecureStorage.getCredentials();
      if (!credentials) {
        return false;
      }

      const result = await AuthService.login(credentials.username, credentials.password, false);
      return result.success;
    } catch (error) {
      console.error('Silent refresh failed:', error);
      return false;
    }
  }

  static async ensureAuthenticated(): Promise<{ Authorization: string; 'Content-Type': string }> {
    try {
      return await this.getAuthHeaders();
    } catch (error) {
      // Try silent refresh if token is missing
      const refreshed = await this.silentRefresh();
      if (!refreshed) {
        throw new Error('Authentication required');
      }
      return this.getAuthHeaders();
    }
  }
} 