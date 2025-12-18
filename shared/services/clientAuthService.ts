import axios from 'axios';
import { Base_url } from '@/app/api/config/BaseUrl';

export interface ClientData {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GenerateOtpResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data: {
    client: ClientData;
    access: {
      token: string;
      expires: string;
    };
  };
}

export interface LogoutResponse {
  message: string;
  success: boolean;
}

class ClientAuthService {
  // Generate OTP for client login
  async generateOtp(email: string, pan: string): Promise<GenerateOtpResponse> {
    try {
      const response = await axios.post(`${Base_url}client-auth/generate-otp`, {
        email: email.trim(),
        pan: pan.trim().toUpperCase()
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate OTP');
    }
  }

  // Verify OTP and login
  async verifyOtp(email: string, pan: string, otp: string): Promise<VerifyOtpResponse> {
    try {
      const response = await axios.post(`${Base_url}client-auth/verify-otp`, {
        email: email.trim(),
        pan: pan.trim().toUpperCase(),
        otp: otp
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to verify OTP');
    }
  }

  // Logout client
  async logout(accessToken: string): Promise<LogoutResponse> {
    try {
      const response = await axios.post(`${Base_url}client-auth/logout`, {
        accessToken: accessToken
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to logout');
    }
  }

  // Get client profile (protected route)
  async getProfile(): Promise<ClientData> {
    try {
      const token = localStorage.getItem('clientToken');
      const response = await axios.get(`${Base_url}client-auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get profile');
    }
  }

  // Validate email format
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate OTP format (6 digits)
  validateOtp(otp: string): boolean {
    const otpRegex = /^\d{6}$/;
    return otpRegex.test(otp);
  }

  // Store client data in localStorage
  storeClientData(client: ClientData, token: string): void {
    localStorage.setItem('clientToken', token);
    localStorage.setItem('clientData', JSON.stringify(client));
  }

  // Get client data from localStorage
  getClientData(): ClientData | null {
    try {
      const clientDataStr = localStorage.getItem('clientData');
      return clientDataStr ? JSON.parse(clientDataStr) : null;
    } catch (error) {
      return null;
    }
  }

  // Get client token from localStorage
  getClientToken(): string | null {
    return localStorage.getItem('clientToken');
  }

  // Clear client data from localStorage
  clearClientData(): void {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientData');
  }

  // Check if client is authenticated
  isAuthenticated(): boolean {
    const token = this.getClientToken();
    const clientData = this.getClientData();
    return !!(token && clientData);
  }

  // Refresh client token (if needed)
  async refreshToken(): Promise<string> {
    try {
      const token = this.getClientToken();
      const response = await axios.post(`${Base_url}client-auth/refresh-token`, {
        accessToken: token
      });
      
      const newToken = response.data.accessToken;
      localStorage.setItem('clientToken', newToken);
      return newToken;
    } catch (error: any) {
      this.clearClientData();
      throw new Error('Token refresh failed');
    }
  }
}

export const clientAuthService = new ClientAuthService();
