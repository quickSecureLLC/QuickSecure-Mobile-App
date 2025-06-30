export interface User {
  id: number;
  email: string;
  role: 'admin' | 'super_admin' | 'teacher' | 'staff';
  school_id: number;
  school_code: string;
  school_name: string;
  first_name: string;
  last_name: string;
  last_login_at: string;
  profileImage?: string;
  department?: string;
  room?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  schoolCode: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  refresh_token: string;
  user: User;
  expires_in: number;
  refresh_expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
  retry_after?: string;
} 