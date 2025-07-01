import React, { createContext, useState, useContext, useEffect } from 'react';
import { AuthService } from '../services/AuthService';
import { User } from '../types/auth';
import { SecureStorage } from '../services/SecureStorage';
import { Alert } from 'react-native';
import { AppLog } from '../utils/logger';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const { isAuthenticated: authStatus, user: userData } = await AuthService.checkAuth();
      
      // If we have stored credentials but no valid session, try biometric login
      if (!authStatus) {
        const hasStoredCredentials = await SecureStorage.getCredentials();
        if (hasStoredCredentials) {
          const biometricResult = await AuthService.loginWithBiometrics();
          if (biometricResult?.success) {
            setIsAuthenticated(true);
            setUser(biometricResult.user);
            return;
          }
        }
      }

      setIsAuthenticated(authStatus);
      setUser(userData);
    } catch (error) {
      AppLog.error('Auth state check failed:', error);
      await logout(); // Ensure clean state on error
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      AppLog.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 