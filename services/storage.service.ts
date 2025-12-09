import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  SETTINGS: 'settings',
  THEME: 'theme',
  CREDENTIALS: 'xtream_credentials',
  FIRST_LOGIN: 'first_login_completed',
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
   * Credentials kaydet (Güvenli depolamaya)
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
      // SecureStore ile güvenli depolama
      await SecureStore.setItemAsync(KEYS.CREDENTIALS, JSON.stringify(credentials));
      console.log('✅ Credentials saved to secure storage');
    } catch (error) {
      console.error('❌ Save credentials error:', error);
      throw error;
    }
  }

  /**
   * Credentials getir (Güvenli depolamadan)
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
      // SecureStore'dan oku
      const stored = await SecureStore.getItemAsync(KEYS.CREDENTIALS);

      if (stored) {
        const credentials = JSON.parse(stored);
        console.log('✅ Credentials loaded from secure storage');
        return credentials;
      } else {
        console.log('ℹ️ No credentials found in secure storage');
        return null;
      }
    } catch (error) {
      console.error('❌ Get credentials error:', error);
      return null;
    }
  }

  /**
   * Credentials temizle (Güvenli depolamadan)
   */
  async clearCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEYS.CREDENTIALS);
      console.log('✅ Credentials cleared from secure storage');
    } catch (error) {
      console.error('❌ Clear credentials error:', error);
      throw error;
    }
  }

  /**
   * İlk giriş tamamlandı mı kontrol et
   */
  async isFirstLoginCompleted(): Promise<boolean> {
    try {
      const completed = await this.getItem<boolean>(KEYS.FIRST_LOGIN);
      return completed === true;
    } catch (error) {
      console.error('❌ First login check error:', error);
      return false;
    }
  }

  /**
   * İlk giriş tamamlandı olarak işaretle
   */
  async markFirstLoginCompleted(): Promise<void> {
    try {
      await this.setItem(KEYS.FIRST_LOGIN, true);
      console.log('✅ First login marked as completed');
    } catch (error) {
      console.error('❌ Mark first login error:', error);
      throw error;
    }
  }

  /**
   * İlk giriş durumunu sıfırla (test/debug için)
   */
  async resetFirstLogin(): Promise<void> {
    try {
      await this.removeItem(KEYS.FIRST_LOGIN);
      console.log('✅ First login status reset');
    } catch (error) {
      console.error('❌ Reset first login error:', error);
      throw error;
    }
  }
  /**
   * Ses ayarlarını getir
   */
  async getAudioSettings(): Promise<{ boostLevel: number; dialogueEnhance: boolean }> {
    try {
      const boostLevel = await this.getItem<string>('audio_boost_level');
      const dialogueEnhance = await this.getItem<string>('dialog_enhancement');

      return {
        boostLevel: boostLevel ? parseFloat(boostLevel) : 1.0,
        dialogueEnhance: dialogueEnhance === 'true',
      };
    } catch (error) {
      console.error('Get audio settings error:', error);
      return { boostLevel: 1.0, dialogueEnhance: false };
    }
  }

  /**
   * Player ayarlarını getir
   */
  async getPlayerSettings(): Promise<{ hwDecoder: boolean; bufferMode: 'low' | 'normal' | 'high' }> {
    try {
      const hwDecoder = await this.getItem<string>('hw_decoder');
      const bufferMode = await this.getItem<string>('buffer_mode');

      return {
        hwDecoder: hwDecoder !== 'false', // Default true
        bufferMode: (bufferMode as 'low' | 'normal' | 'high') || 'normal',
      };
    } catch (error) {
      console.error('Get player settings error:', error);
      return { hwDecoder: true, bufferMode: 'normal' };
    }
  }

  /**
   * Buffer modunu kaydet
   */
  async saveBufferMode(mode: 'low' | 'normal' | 'high'): Promise<void> {
    await this.setItem('buffer_mode', mode);
  }
}

export default new StorageService();

