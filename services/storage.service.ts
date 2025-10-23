import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  FAVORITES: 'favorites',
  WATCH_HISTORY: 'watch_history',
  CONTINUE_WATCHING: 'continue_watching',
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
   * Favorilere ekle
   */
  async addToFavorites(item: {
    id: string;
    type: 'channel' | 'movie' | 'series';
  }): Promise<void> {
    try {
      const favorites = await this.getItem<any[]>(KEYS.FAVORITES) || [];
      const exists = favorites.some((fav) => fav.id === item.id);
      
      if (!exists) {
        favorites.push({ ...item, addedAt: new Date().toISOString() });
        await this.setItem(KEYS.FAVORITES, favorites);
      }
    } catch (error) {
      console.error('Add to favorites error:', error);
      throw error;
    }
  }

  /**
   * Favorilerden çıkar
   */
  async removeFromFavorites(itemId: string): Promise<void> {
    try {
      const favorites = await this.getItem<any[]>(KEYS.FAVORITES) || [];
      const filtered = favorites.filter((fav) => fav.id !== itemId);
      await this.setItem(KEYS.FAVORITES, filtered);
    } catch (error) {
      console.error('Remove from favorites error:', error);
      throw error;
    }
  }

  /**
   * Favorileri getir
   */
  async getFavorites(): Promise<any[]> {
    return await this.getItem<any[]>(KEYS.FAVORITES) || [];
  }

  /**
   * İzleme geçmişine ekle
   */
  async addToHistory(item: {
    id: string;
    type: 'channel' | 'movie' | 'series' | 'episode';
    title: string;
    poster?: string;
  }): Promise<void> {
    try {
      const history = await this.getItem<any[]>(KEYS.WATCH_HISTORY) || [];
      
      // Eğer daha önce izlenmişse, sil (en son izlenenlerin üste çıkması için)
      const filtered = history.filter((item_h) => item_h.id !== item.id);
      
      // En başa ekle
      filtered.unshift({ ...item, watchedAt: new Date().toISOString() });
      
      // En fazla 100 kayıt tut
      const limited = filtered.slice(0, 100);
      
      await this.setItem(KEYS.WATCH_HISTORY, limited);
    } catch (error) {
      console.error('Add to history error:', error);
      throw error;
    }
  }

  /**
   * İzleme geçmişini getir
   */
  async getHistory(): Promise<any[]> {
    return await this.getItem<any[]>(KEYS.WATCH_HISTORY) || [];
  }

  /**
   * İzlemeye devam et (progress kaydet)
   */
  async saveContinueWatching(item: {
    id: string;
    type: 'movie' | 'episode';
    title: string;
    poster?: string;
    progress: number; // 0-100 arası yüzde
    duration: number; // toplam süre (saniye)
    currentTime: number; // mevcut süre (saniye)
  }): Promise<void> {
    try {
      const continueWatching = await this.getItem<any[]>(KEYS.CONTINUE_WATCHING) || [];
      
      // Aynı içerik varsa güncelle
      const index = continueWatching.findIndex((cw) => cw.id === item.id);
      
      if (index !== -1) {
        continueWatching[index] = { ...item, updatedAt: new Date().toISOString() };
      } else {
        continueWatching.unshift({ ...item, updatedAt: new Date().toISOString() });
      }
      
      // En fazla 50 kayıt tut
      const limited = continueWatching.slice(0, 50);
      
      await this.setItem(KEYS.CONTINUE_WATCHING, limited);
    } catch (error) {
      console.error('Save continue watching error:', error);
      throw error;
    }
  }

  /**
   * İzlemeye devam et listesini getir
   */
  async getContinueWatching(): Promise<any[]> {
    return await this.getItem<any[]>(KEYS.CONTINUE_WATCHING) || [];
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
  } | null> {
    try {
      const credentials = await this.getItem<{
        host: string;
        port: string;
        username: string;
        password: string;
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


