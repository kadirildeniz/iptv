import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SETTINGS: 'settings',
  THEME: 'theme',
  CREDENTIALS: 'xtream_credentials',
};

class StorageService {
  /**
   * Veri kaydet
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Storage set error:', error);
      throw error;
    }
  }

  /**
   * Veri al
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  /**
   * Veri sil
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw error;
    }
  }

  /**
   * Tüm verileri temizle
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }

  /**
   * Ayarları kaydet
   */
  async saveSettings(settings: any): Promise<void> {
    await this.setItem(KEYS.SETTINGS, settings);
  }

  /**
   * Ayarları getir
   */
  async getSettings(): Promise<any> {
    return await this.getItem(KEYS.SETTINGS);
  }

  /**
   * Credentials kaydet
   */
  async saveCredentials(credentials: {
    host: string;
    port: string;
    username: string;
    password: string;
    iptvName?: string;
    protocol?: 'http' | 'https';
  }): Promise<void> {
    try {
      await this.setItem(KEYS.CREDENTIALS, credentials);
      console.log('✅ Credentials saved to storage');
    } catch (error) {
      console.error('❌ Save credentials error:', error);
      throw error;
    }
  }

  /**
   * Credentials getir
   */
  async getCredentials(): Promise<{
    host: string;
    port: string;
    username: string;
    password: string;
    iptvName?: string;
    protocol?: 'http' | 'https';
  } | null> {
    try {
      const credentials = await this.getItem<{
        host: string;
        port: string;
        username: string;
        password: string;
        iptvName?: string;
        protocol?: 'http' | 'https';
      }>(KEYS.CREDENTIALS);
      
      if (credentials) {
        console.log('✅ Credentials loaded from storage');
      } else {
        console.log('ℹ️ No credentials found in storage');
      }
      
      return credentials;
    } catch (error) {
      console.error('❌ Get credentials error:', error);
      return null;
    }
  }

  /**
   * Credentials temizle
   */
  async clearCredentials(): Promise<void> {
    try {
      await this.removeItem(KEYS.CREDENTIALS);
      console.log('✅ Credentials cleared from storage');
    } catch (error) {
      console.error('❌ Clear credentials error:', error);
      throw error;
    }
  }
}

export default new StorageService();


