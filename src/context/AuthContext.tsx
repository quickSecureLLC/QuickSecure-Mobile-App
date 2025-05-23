import React, { createContext, useState, useContext, useEffect } from 'react';
import { AuthService, User } from '../services/AuthService';
import { SecureStorage } from '../services/SecureStorage';

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
      console.error('Auth state check failed:', error);
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
    await AuthService.logout();
    // Don't clear stored credentials - we want to keep them for next biometric login
    setUser(null);
    setIsAuthenticated(false);
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