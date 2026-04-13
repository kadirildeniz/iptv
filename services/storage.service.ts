import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native'; // 👈 SİHİRLİ IMPORT EKLENDİ

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

  // ==================== CREDENTIALS (HİBRİT YAPILANDIRMA) ====================

  /**
   * Credentials kaydet (Mobil için Güvenli, Web için Normal depolama)
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
      const jsonValue = JSON.stringify(credentials);

      if (Platform.OS === 'web') {
        // Web (Tarayıcı) için standart AsyncStorage
        await AsyncStorage.setItem(KEYS.CREDENTIALS, jsonValue);
        console.log('✅ Credentials saved to AsyncStorage (Web Mode)');
      } else {
        // Mobil cihazlar için donanımsal SecureStore
        await SecureStore.setItemAsync(KEYS.CREDENTIALS, jsonValue);
        console.log('✅ Credentials saved to secure storage (Native Mode)');
      }
    } catch (error) {
      console.error('❌ Save credentials error:', error);
      throw error;
    }
  }

  /**
   * Credentials getir (Platforma Göre)
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
      let stored: string | null = null;

      if (Platform.OS === 'web') {
        stored = await AsyncStorage.getItem(KEYS.CREDENTIALS);
      } else {
        stored = await SecureStore.getItemAsync(KEYS.CREDENTIALS);
      }

      if (stored) {
        const credentials = JSON.parse(stored);
        console.log(`✅ Credentials loaded (${Platform.OS === 'web' ? 'Web' : 'Native'})`);
        return credentials;
      } else {
        console.log('ℹ️ No credentials found in storage');
        return null;
      }
    } catch (error) {
      console.error('❌ Get credentials error:', error);
      return null;
    }
  }

  /**
   * Credentials temizle (Çıkış Yap / Logout)
   */
  async clearCredentials(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(KEYS.CREDENTIALS);
      } else {
        await SecureStore.deleteItemAsync(KEYS.CREDENTIALS);
      }
      console.log('✅ Credentials cleared from storage');
    } catch (error) {
      console.error('❌ Clear credentials error:', error);
      throw error;
    }
  }

  // =========================================================================

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
   * Ses ayarlarını getir (dil tercihi dahil)
   */
  async getAudioSettings(): Promise<{
    boostLevel: number;
    dialogueEnhance: boolean;
    preferredLanguage: string;
  }> {
    try {
      const boostLevel = await this.getItem<string>('audio_boost_level');
      const dialogueEnhance = await this.getItem<string>('dialog_enhancement');
      const preferredLanguage = await this.getItem<string>('preferred_audio_language');

      return {
        boostLevel: boostLevel ? parseFloat(boostLevel) : 1.0,
        dialogueEnhance: dialogueEnhance === 'true',
        preferredLanguage: preferredLanguage || 'off', // Default: off (kapalı)
      };
    } catch (error) {
      console.error('Get audio settings error:', error);
      return { boostLevel: 1.0, dialogueEnhance: false, preferredLanguage: 'off' };
    }
  }

  /**
   * Tercih edilen ses dilini kaydet
   * Dil kodları: 'tur' | 'eng' | 'ger' | 'fra' | 'spa' | 'ara' | 'original' | 'off'
   */
  async setPreferredAudioLanguage(lang: string): Promise<void> {
    await this.setItem('preferred_audio_language', lang);
    console.log(`🌐 Tercih edilen ses dili: ${lang}`);
  }

  /**
   * Tercih edilen ses dilini getir
   */
  async getPreferredAudioLanguage(): Promise<string> {
    const lang = await this.getItem<string>('preferred_audio_language');
    return lang || 'off';
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

  // ==================== DEBUG FONKSIYONLARI ====================

  /**
   * Tüm AsyncStorage verilerini konsola yazdır
   */
  async debugAsyncStorage(): Promise<void> {
    try {
      console.log('\n==================== ASYNC STORAGE DEBUG ====================');
      const keys = await AsyncStorage.getAllKeys();
      console.log(`📦 Toplam ${keys.length} anahtar bulundu:`);

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`\n🔑 ${key}:`);
        try {
          const parsed = JSON.parse(value || '');
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          console.log(value);
        }
      }
      console.log('\n=============================================================\n');
    } catch (error) {
      console.error('Debug AsyncStorage hatası:', error);
    }
  }

  /**
   * SecureStore verilerini konsola yazdır (Web uyumlu hale getirildi)
   */
  async debugSecureStore(): Promise<void> {
    try {
      console.log('\n==================== SECURE STORE DEBUG ====================');

      let credentialsString: string | null = null;
      if (Platform.OS === 'web') {
        credentialsString = await AsyncStorage.getItem(KEYS.CREDENTIALS);
      } else {
        credentialsString = await SecureStore.getItemAsync(KEYS.CREDENTIALS);
      }

      if (credentialsString) {
        const parsed = JSON.parse(credentialsString);
        console.log('🔐 Credentials:');
        console.log({
          host: parsed.host,
          username: parsed.username,
          password: '******', // Şifreyi gizle
          iptvName: parsed.iptvName,
        });
      } else {
        console.log('❌ Credentials bulunamadı');
      }
      console.log('\n=============================================================\n');
    } catch (error) {
      console.error('Debug SecureStore hatası:', error);
    }
  }

  /**
   * Tüm debug verilerini yazdır (AsyncStorage + SecureStore)
   */
  async debugAll(): Promise<void> {
    await this.debugAsyncStorage();
    await this.debugSecureStore();
  }
}

export default new StorageService();