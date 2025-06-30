import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const CREDENTIALS_KEY = 'qs_credentials';
const BIOMETRICS_ENABLED_KEY = 'qs_biometrics_enabled';

interface StoredCredentials {
  email: string;
  password: string;
  schoolCode: string;
}

export class SecureStorage {
  static async getItemAsync(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item from secure storage:', error);
      return null;
    }
  }

  static async setItemAsync(key: string, value: any): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await SecureStore.setItemAsync(key, stringValue);
    } catch (error) {
      console.error('Error setting item in secure storage:', error);
    }
  }

  static async removeItemAsync(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item from secure storage:', error);
    }
  }

  static async storeCredentials(email: string, password: string, schoolCode: string): Promise<void> {
    try {
      const credentials: StoredCredentials = { email, password, schoolCode };
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
      // Enable biometrics by default if available
      const biometricsAvailable = await LocalAuthentication.hasHardwareAsync();
      if (biometricsAvailable) {
        await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, 'true');
      }
    } catch (error) {
      console.error('Error storing credentials:', error);
    }
  }

  static async getCredentials(): Promise<StoredCredentials | null> {
    try {
      const credentialsStr = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      return credentialsStr ? JSON.parse(credentialsStr) : null;
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  }

  static async isBiometricsEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometrics status:', error);
      return false;
    }
  }

  static async setBiometricsEnabled(enabled: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      console.error('Error setting biometrics status:', error);
    }
  }

  static async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const biometricsAvailable = await LocalAuthentication.hasHardwareAsync();
      if (!biometricsAvailable) {
        return false;
      }

      const biometricsEnabled = await this.isBiometricsEnabled();
      if (!biometricsEnabled) {
        return false;
      }

      const { success } = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access QuickSecure',
        fallbackLabel: 'Use password instead',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return success;
    } catch (error) {
      console.error('Error authenticating with biometrics:', error);
      return false;
    }
  }

  static async clearStoredCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRICS_ENABLED_KEY);
    } catch (error) {
      console.error('Error clearing credentials:', error);
    }
  }
} 