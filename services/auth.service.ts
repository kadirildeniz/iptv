import apiClient, { XtreamCredentials } from './api/client';
import { ENDPOINTS } from './api/endpoints';
import { AccountInfo } from './api/types';

class AuthService {
  /**
   * Kullanıcı girişi - Xtream Codes credentials kaydet
   */
  async login(credentials: XtreamCredentials): Promise<AccountInfo> {
    try {
      console.log('🔐 AuthService.login called with:', {
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        // password: '***' // Güvenlik için password'u loglamıyoruz
      });

      // Credentials'ı kaydet
      await apiClient.saveCredentials(credentials);
      console.log('✅ Credentials saved');

      // Account info kontrolü (Xtream Codes authentication)
      console.log('🔍 Getting account info...');
      const accountInfo = await this.getAccountInfo();
      console.log('📊 Account info received:', {
        auth: accountInfo.user_info.auth,
        status: accountInfo.user_info.status,
        username: accountInfo.user_info.username
      });

      // Auth başarısız mı kontrol et
      if (accountInfo.user_info.auth === 0) {
        console.error('❌ Authentication failed: auth = 0');
        await apiClient.clearCredentials();
        throw new Error('Authentication failed: Invalid credentials');
      }

      // Hesap aktif mi kontrol et
      if (accountInfo.user_info.status !== 'Active') {
        console.error('❌ Account not active:', accountInfo.user_info.status);
        await apiClient.clearCredentials();
        throw new Error(`Account is not active. Status: ${accountInfo.user_info.status}`);
      }

      console.log('✅ Login successful');
      return accountInfo;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  /**
   * Hesap bilgilerini getir
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const response = await apiClient.get<AccountInfo>(
        ENDPOINTS.PLAYER_API,
        { action: ENDPOINTS.ACTIONS.GET_ACCOUNT_INFO }
      );
      return response;
    } catch (error) {
      console.error('Get account info error:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı çıkışı
   */
  async logout(): Promise<void> {
    try {
      await apiClient.clearCredentials();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Credentials'ı yükle (uygulama başladığında)
   */
  async loadCredentials(): Promise<XtreamCredentials | null> {
    try {
      return await apiClient.loadCredentials();
    } catch (error) {
      console.error('Load credentials error:', error);
      return null;
    }
  }

  /**
   * Kullanıcının giriş yapıp yapmadığını kontrol et
   */
  isAuthenticated(): boolean {
    return apiClient.hasCredentials();
  }

  /**
   * Mevcut credentials'ı al
   */
  getCredentials(): XtreamCredentials | null {
    return apiClient.getCredentials();
  }

  /**
   * Hesap durumunu kontrol et
   */
  async checkAccountStatus(): Promise<{
    isActive: boolean;
    expiryDate: string;
    daysRemaining: number;
    message: string;
  }> {
    try {
      const accountInfo = await this.getAccountInfo();
      const expiryTimestamp = parseInt(accountInfo.user_info.exp_date) * 1000;
      const now = Date.now();
      const daysRemaining = Math.floor((expiryTimestamp - now) / (1000 * 60 * 60 * 24));

      return {
        isActive: accountInfo.user_info.status === 'Active',
        expiryDate: new Date(expiryTimestamp).toISOString(),
        daysRemaining: Math.max(0, daysRemaining),
        message: accountInfo.user_info.message,
      };
    } catch (error) {
      console.error('Check account status error:', error);
      throw error;
    }
  }
}

export default new AuthService();
