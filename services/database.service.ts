import { database } from './database';
import Favorite from './database/models/Favorite';
import WatchHistory from './database/models/WatchHistory';
import ContinueWatching from './database/models/ContinueWatching';
import EpisodeProgress from './database/models/EpisodeProgress';

export interface FavoriteItem {
  id: string;
  type: 'movie' | 'series' | 'channel';
  title: string;
  poster?: string;
  cover?: string;
}

export interface WatchHistoryItem {
  id: string;
  type: 'movie' | 'series' | 'channel';
  title: string;
  poster?: string;
  duration?: number;
  progress?: number;
  watchedAt: Date;
}

export interface ContinueWatchingItem {
  id: string;
  type: 'movie' | 'series' | 'channel';
  title: string;
  poster?: string;
  cover?: string;
  progress: number;
  currentTime: number;
  duration: number;
}

export interface EpisodeProgressItem {
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeId: string;
  title?: string;
  progress: number;
  currentTime: number;
  duration: number;
  watched: boolean;
}

class DatabaseService {
  /**
   * Database'in hazır olup olmadığını kontrol et
   */
  private checkDatabase(): void {
    if (!database) {
      throw new Error('Database is not initialized. Please install expo-sqlite: npm install expo-sqlite');
    }
  }

  // ============================================
  // FAVORITES
  // ============================================

  /**
   * Favorilere ekle
   */
  async addToFavorites(item: FavoriteItem): Promise<void> {
    this.checkDatabase();
    await database!.write(async () => {
      // Önce var mı kontrol et
      const existing = await database!
        .get<Favorite>('favorites')
        .find(item.id);

      if (existing) {
        // Varsa güncelle
        await existing.update((fav) => {
          fav.title = item.title;
          fav.poster = item.poster;
          fav.cover = item.cover;
          fav.updatedAt = new Date();
        });
      } else {
        // Yoksa yeni oluştur
        await database!.get<Favorite>('favorites').create((fav) => {
          fav.itemId = item.id;
          fav.itemType = item.type;
          fav.title = item.title;
          fav.poster = item.poster;
          fav.cover = item.cover;
          fav.createdAt = new Date();
          fav.updatedAt = new Date();
        });
      }
    });
  }

  /**
   * Favorilerden çıkar
   */
  async removeFromFavorites(itemId: string): Promise<void> {
    this.checkDatabase();
    await database!.write(async () => {
      try {
        const favorite = await database!
          .get<Favorite>('favorites')
          .find(itemId);
        await favorite.destroyPermanently();
      } catch (error) {
        console.log('Favorite not found:', itemId);
      }
    });
  }

  /**
   * Favori toggle (ekle/çıkar)
   */
  async toggleFavorite(item: {
    id: string;
    type: 'channel' | 'movie' | 'series';
    title?: string;
    poster?: string;
    cover?: string;
  }): Promise<boolean> {
    try {
      const isFav = await this.isFavorite(item.id);
      
      if (isFav) {
        await this.removeFromFavorites(item.id);
        return false;
      } else {
        await this.addToFavorites({
          id: item.id,
          type: item.type,
          title: item.title || '',
          poster: item.poster,
          cover: item.cover,
        });
        return true;
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      throw error;
    }
  }

  /**
   * Favori mi kontrol et
   */
  async isFavorite(itemId: string): Promise<boolean> {
    if (!database) return false;
    try {
      const favorite = await database
        .get<Favorite>('favorites')
        .find(itemId);
      return !!favorite;
    } catch {
      return false;
    }
  }

  /**
   * Tüm favorileri getir
   */
  async getFavorites(): Promise<FavoriteItem[]> {
    if (!database) return [];
    const favorites = await database
      .get<Favorite>('favorites')
      .query()
      .fetch();

    return favorites.map((fav) => ({
      id: fav.itemId,
      type: fav.itemType as 'movie' | 'series' | 'channel',
      title: fav.title,
      poster: fav.poster,
      cover: fav.cover,
    }));
  }

  /**
   * Favorileri temizle
   */
  async clearFavorites(): Promise<void> {
    if (!database) return;
    await database.write(async () => {
      const favorites = await database
        .get<Favorite>('favorites')
        .query()
        .fetch();
      await Promise.all(favorites.map((fav) => fav.destroyPermanently()));
    });
  }

  // ============================================
  // WATCH HISTORY
  // ============================================

  /**
   * İzleme geçmişine ekle
   */
  async addToHistory(item: Omit<WatchHistoryItem, 'watchedAt'>): Promise<void> {
    if (!database) return;
    await database.write(async () => {
      await database.get<WatchHistory>('watch_history').create((history) => {
        history.itemId = item.id;
        history.itemType = item.type;
        history.title = item.title;
        history.poster = item.poster;
        history.duration = item.duration;
        history.progress = item.progress;
        history.watchedAt = new Date();
      });
    });
  }

  /**
   * İzleme geçmişini getir
   */
  async getHistory(limit: number = 100): Promise<WatchHistoryItem[]> {
    if (!database) return [];
    const history = await database
      .get<WatchHistory>('watch_history')
      .query()
      .fetch();

    return history
      .slice(0, limit)
      .map((item) => ({
        id: item.itemId,
        type: item.itemType as 'movie' | 'series' | 'channel',
        title: item.title,
        poster: item.poster,
        duration: item.duration,
        progress: item.progress,
        watchedAt: item.watchedAt,
      }));
  }

  /**
   * İzleme geçmişini temizle
   */
  async clearHistory(): Promise<void> {
    if (!database) return;
    await database.write(async () => {
      const history = await database
        .get<WatchHistory>('watch_history')
        .query()
        .fetch();
      await Promise.all(history.map((item) => item.destroyPermanently()));
    });
  }

  // ============================================
  // CONTINUE WATCHING
  // ============================================

  /**
   * İzlemeye devam et kaydet
   */
  async saveContinueWatching(item: ContinueWatchingItem): Promise<void> {
    if (!database) return;
    await database.write(async () => {
      try {
        // Önce var mı kontrol et
        const existing = await database
          .get<ContinueWatching>('continue_watching')
          .find(item.id);

        if (existing) {
          // Varsa güncelle
          await existing.update((cw) => {
            cw.title = item.title;
            cw.poster = item.poster;
            cw.cover = item.cover;
            cw.progress = item.progress;
            cw.currentTime = item.currentTime;
            cw.duration = item.duration;
            cw.updatedAt = new Date();
          });
        } else {
          // Yoksa yeni oluştur
          await database.get<ContinueWatching>('continue_watching').create((cw) => {
            cw.itemId = item.id;
            cw.itemType = item.type;
            cw.title = item.title;
            cw.poster = item.poster;
            cw.cover = item.cover;
            cw.progress = item.progress;
            cw.currentTime = item.currentTime;
            cw.duration = item.duration;
            cw.updatedAt = new Date();
          });
        }
      } catch (error) {
        // Eğer bulunamadıysa yeni oluştur
        await database.get<ContinueWatching>('continue_watching').create((cw) => {
          cw.itemId = item.id;
          cw.itemType = item.type;
          cw.title = item.title;
          cw.poster = item.poster;
          cw.cover = item.cover;
          cw.progress = item.progress;
          cw.currentTime = item.currentTime;
          cw.duration = item.duration;
          cw.updatedAt = new Date();
        });
      }
    });
  }

  /**
   * İzlemeye devam et listesini getir
   */
  async getContinueWatching(): Promise<ContinueWatchingItem[]> {
    if (!database) return [];
    const continueWatching = await database
      .get<ContinueWatching>('continue_watching')
      .query()
      .fetch();

    return continueWatching.map((item) => ({
      id: item.itemId,
      type: item.itemType as 'movie' | 'series' | 'channel',
      title: item.title,
      poster: item.poster,
      cover: item.cover,
      progress: item.progress,
      currentTime: item.currentTime,
      duration: item.duration,
    }));
  }

  /**
   * İzlemeye devam etten kaldır
   */
  async removeContinueWatching(itemId: string): Promise<void> {
    if (!database) return;
    await database.write(async () => {
      try {
        const item = await database
          .get<ContinueWatching>('continue_watching')
          .find(itemId);
        await item.destroyPermanently();
      } catch (error) {
        console.log('Continue watching item not found:', itemId);
      }
    });
  }

  // ============================================
  // EPISODE PROGRESS
  // ============================================

  /**
   * Bölüm ilerlemesini kaydet
   */
  async saveEpisodeProgress(item: EpisodeProgressItem): Promise<void> {
    if (!database) return;
    await database.write(async () => {
      try {
        // Önce var mı kontrol et
        const existing = await database
          .get<EpisodeProgress>('episode_progress')
          .query()
          .where('episode_id', item.episodeId)
          .fetch();

        if (existing.length > 0) {
          // Varsa güncelle
          await existing[0].update((ep) => {
            ep.progress = item.progress;
            ep.currentTime = item.currentTime;
            ep.duration = item.duration;
            ep.watched = item.watched;
            ep.updatedAt = new Date();
          });
        } else {
          // Yoksa yeni oluştur
          await database.get<EpisodeProgress>('episode_progress').create((ep) => {
            ep.seriesId = item.seriesId;
            ep.seasonNumber = item.seasonNumber;
            ep.episodeNumber = item.episodeNumber;
            ep.episodeId = item.episodeId;
            ep.title = item.title;
            ep.progress = item.progress;
            ep.currentTime = item.currentTime;
            ep.duration = item.duration;
            ep.watched = item.watched;
            ep.updatedAt = new Date();
          });
        }
      } catch (error) {
        console.error('Error saving episode progress:', error);
      }
    });
  }

  /**
   * Bölüm ilerlemesini getir
   */
  async getEpisodeProgress(episodeId: string): Promise<EpisodeProgressItem | null> {
    if (!database) return null;
    try {
      const progress = await database
        .get<EpisodeProgress>('episode_progress')
        .query()
        .where('episode_id', episodeId)
        .fetch();

      if (progress.length === 0) return null;

      const item = progress[0];
      return {
        seriesId: item.seriesId,
        seasonNumber: item.seasonNumber,
        episodeNumber: item.episodeNumber,
        episodeId: item.episodeId,
        title: item.title,
        progress: item.progress,
        currentTime: item.currentTime,
        duration: item.duration,
        watched: item.watched,
      };
    } catch {
      return null;
    }
  }

  /**
   * Seri için tüm bölüm ilerlemelerini getir
   */
  async getSeriesEpisodeProgress(seriesId: string): Promise<EpisodeProgressItem[]> {
    if (!database) return [];
    const progress = await database
      .get<EpisodeProgress>('episode_progress')
      .query()
      .where('series_id', seriesId)
      .fetch();

    return progress.map((item) => ({
      seriesId: item.seriesId,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
      episodeId: item.episodeId,
      title: item.title,
      progress: item.progress,
      currentTime: item.currentTime,
      duration: item.duration,
      watched: item.watched,
    }));
  }
}

export default new DatabaseService();

