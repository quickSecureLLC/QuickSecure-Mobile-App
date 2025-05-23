import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const CREDENTIALS_KEY = 'qs_credentials';
const BIOMETRICS_ENABLED_KEY = 'qs_biometrics_enabled';

interface StoredCredentials {
  username: string;
  password: string;
}

export class SecureStorage {
  static async storeCredentials(username: string, password: string): Promise<void> {
    try {
      const credentials: StoredCredentials = { username, password };
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