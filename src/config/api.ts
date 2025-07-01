// Network configuration for API endpoints
// This is the single source of API config for QuickSecure
export const API_BASE_URL = 'http://184.73.75.174:3000';

// API timeout configuration
export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  timeout: 30000,        // 30 seconds
  retryAttempts: 3,      // Retry failed requests
  retryDelay: 1000,      // 1 second between retries
  exponentialBackoff: true,
  requestIdHeader: 'X-Request-ID',
};

// Helper function to construct API URLs
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}/api/${endpoint}`;
};

// Generate unique request ID for tracing
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const API_ENDPOINTS = {
  // Authentication
  login: 'mobile/auth/login',
  refresh: 'auth/refresh',
  
  // User management
  userProfile: 'users/me',
  pushToken: 'users/me/push-token',
  
  // Alerts
  alerts: 'alerts',
  latestAlert: 'alerts/latest',
  
  // Health check
  health: 'health'
};

export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Client-Version': '1.0.0',
  'X-Platform': 'react-native'
};

// Add auth headers helper
export const getAuthHeaders = (token: string): HeadersInit => ({
  ...DEFAULT_HEADERS,
  'Authorization': `Bearer ${token}`,
  'X-Request-ID': generateRequestId()
});

// Add request headers helper
export const getRequestHeaders = (token?: string): HeadersInit => {
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  headers['X-Request-ID'] = generateRequestId();
  return headers;
}; 