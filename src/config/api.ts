// Network configuration for API endpoints
const LOCAL_API = 'http://localhost:3002/api';
const NETWORK_API = 'http://10.10.0.124:3002/api';

// Set this to false to use network API
const USE_LOCAL_API = false;

export const API_BASE_URL = USE_LOCAL_API ? LOCAL_API : NETWORK_API;

// Helper function to construct API URLs
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}/${endpoint}`.replace(/\/+/g, '/');
}; 