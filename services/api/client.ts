import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Xtream Codes Credentials Storage Keys
const CREDENTIALS_KEY = 'xtream_credentials';

// Xtream Codes Credentials Interface
export interface XtreamCredentials {
  host: string;
  port?: string;
  username: string;
  password: string;
  protocol?: 'http' | 'https';
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  private credentials: XtreamCredentials | null = null;

  constructor() {
    // Default axios instance
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor - Hata yönetimi
    this.axiosInstance.interceptors.response.use(
      (response: any) => {
        return response;
      },
      (error: any) => {
        if (error.response) {
          console.error('API Error:', error.response.data);
          
          if (error.response.status === 401 || error.response.status === 403) {
            // Credentials geçersiz
            console.error('Authentication failed');
          }
        } else if (error.request) {
          console.error('Network Error:', error.request);
        } else {
          console.error('Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Credentials'ı kaydet
   */
  async saveCredentials(credentials: XtreamCredentials): Promise<void> {
    this.credentials = credentials;
    await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  }

  /**
   * Credentials'ı yükle
   */
  async loadCredentials(): Promise<XtreamCredentials | null> {
    try {
      const stored = await AsyncStorage.getItem(CREDENTIALS_KEY);
      if (stored) {
        this.credentials = JSON.parse(stored);
        return this.credentials;
      }
      return null;
    } catch (error) {
      console.error('Load credentials error:', error);
      return null;
    }
  }

  /**
   * Credentials'ı temizle
   */
  async clearCredentials(): Promise<void> {
    this.credentials = null;
    await AsyncStorage.removeItem(CREDENTIALS_KEY);
  }

  /**
   * Base URL oluştur
   */
  getBaseUrl(): string {
    if (!this.credentials) {
      throw new Error('Credentials not configured. Please login first.');
    }

    const protocol = this.credentials.protocol || 'http';
    const port = this.credentials.port || '';
    const portPart = port ? `:${port}` : '';
    
    return `${protocol}://${this.credentials.host}${portPart}`;
  }

  /**
   * Xtream Codes API parametrelerini ekle
   */
  private addAuthParams(params: any = {}): any {
    if (!this.credentials) {
      throw new Error('Credentials not configured. Please login first.');
    }

    return {
      ...params,
      username: this.credentials.username,
      password: this.credentials.password,
    };
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: any): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    console.log('🌐 API GET Request:', url);
    console.log('📋 API Params:', this.addAuthParams(params));
    
    const response = await this.axiosInstance.get<T>(url, {
      params: this.addAuthParams(params),
    });
    
    console.log('✅ API Response:', response.data);
    return response.data;
  }

  /**
   * POST request (Xtream Codes'da genelde kullanılmaz ama hazır olsun)
   */
  async post<T>(endpoint: string, data?: any, params?: any): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const response = await this.axiosInstance.post<T>(url, data, {
      params: this.addAuthParams(params),
    });
    return response.data;
  }

  /**
   * Credentials kontrolü
   */
  hasCredentials(): boolean {
    return this.credentials !== null;
  }

  /**
   * Mevcut credentials'ı al
   */
  getCredentials(): XtreamCredentials | null {
    return this.credentials;
  }
}

// Singleton instance
const apiClient = new ApiClient();

export default apiClient;

