import { database } from './database';
import storageService from './storage.service';
import movieService from './movie.service';
import seriesService from './series.service';
import channelService from './channel.service';
import type { Movie as ApiMovie, Series as ApiSeries, LiveStream, VodStream } from './api/types';
import MovieModel from './database/models/Movie';
import SeriesModel from './database/models/Series';
import ChannelModel from './database/models/Channel';

const SYNC_KEYS = {
  MOVIES: 'LAST_SYNC_MOVIES',
  SERIES: 'LAST_SYNC_SERIES',
  CHANNELS: 'LAST_SYNC_CHANNELS',
  EPG: 'LAST_SYNC_EPG',
};

// Senkronizasyon eşikleri (saat cinsinden)
const SYNC_THRESHOLDS = {
  MOVIES: 24, // 24 saat
  SERIES: 24, // 24 saat
  CHANNELS: 12, // 12 saat
  EPG: 1, // 1 saat
};

type SyncType = 'movies' | 'series' | 'channels' | 'epg';

class SyncService {
  private isSyncing: Map<SyncType, boolean> = new Map();

  /**
   * Senkronizasyon gerekip gerekmediğini kontrol et ve gerekirse çalıştır
   */
  async checkAndRunSync(type: SyncType): Promise<void> {
    // Eğer zaten senkronizasyon yapılıyorsa, yeni bir tane başlatma
    if (this.isSyncing.get(type)) {
      console.log(`⏳ ${type} sync already in progress, skipping...`);
      return;
    }

    try {
      const lastSyncKey = SYNC_KEYS[type.toUpperCase() as keyof typeof SYNC_KEYS];
      const lastSync = await storageService.getItem<string>(lastSyncKey);
      const threshold = SYNC_THRESHOLDS[type.toUpperCase() as keyof typeof SYNC_THRESHOLDS];

      if (lastSync) {
        const lastSyncTime = new Date(lastSync).getTime();
        const now = Date.now();
        const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60);

        if (hoursSinceSync < threshold) {
          console.log(`✅ ${type} sync not needed (${hoursSinceSync.toFixed(1)}h < ${threshold}h)`);
          return;
        }
      }

      // Senkronizasyon gerekiyor
      console.log(`🔄 Starting ${type} sync...`);
      this.isSyncing.set(type, true);

      switch (type) {
        case 'movies':
          await this.syncMovies();
          break;
        case 'series':
          await this.syncSeries();
          break;
        case 'channels':
          await this.syncChannels();
          break;
        case 'epg':
          await this.syncEPG();
          break;
      }

      // Başarılı senkronizasyon sonrası zaman damgasını güncelle
      await storageService.setItem(lastSyncKey, new Date().toISOString());
      console.log(`✅ ${type} sync completed`);
    } catch (error) {
      console.error(`❌ ${type} sync error:`, error);
    } finally {
      this.isSyncing.set(type, false);
    }
  }

  /**
   * Filmleri senkronize et (Delta bulma ve batch işlem)
   */
  private async syncMovies(): Promise<void> {
    if (!database) {
      console.warn('⚠️ Database not initialized, skipping movies sync');
      return;
    }

    try {
      // 1. API'den tüm filmleri çek (categoryId olmadan tüm filmler)
      console.log('📡 Fetching movies from API...');
      const apiMovies = await movieService.getMovies(); // categoryId olmadan tüm filmler
      console.log(`📦 Fetched ${apiMovies.length} movies from API`);

      // 2. WatermelonDB'den mevcut film ID'lerini çek
      if (!database) {
        console.warn('⚠️ Database not available');
        return;
      }

      const localMovies = await database
        .get<MovieModel>('movies')
        .query()
        .fetch();
      const localMovieIds = new Set(localMovies.map(m => m.streamId.toString()));
      console.log(`💾 Found ${localMovieIds.size} movies in local database`);

      // 3. Delta bulma
      const apiMovieIds = new Set(apiMovies.map(m => m.stream_id.toString()));
      
      const moviesToCreate = apiMovies.filter(
        m => !localMovieIds.has(m.stream_id.toString())
      );
      const moviesToDelete = localMovies.filter(
        m => !apiMovieIds.has(m.streamId.toString())
      );

      console.log(`➕ ${moviesToCreate.length} movies to create`);
      console.log(`➖ ${moviesToDelete.length} movies to delete`);

      if (moviesToCreate.length === 0 && moviesToDelete.length === 0) {
        console.log('✅ Movies are already in sync');
        return;
      }

      // 4. Batch işlemler hazırla
      if (!database) return;
      
      const db = database; // TypeScript için local variable
      await db.write(async () => {
        const batchActions: any[] = [];

        // Yeni filmleri ekle
        for (const apiMovie of moviesToCreate) {
          batchActions.push(
            db.get<MovieModel>('movies').prepareCreate((movie) => {
              movie.streamId = apiMovie.stream_id;
              movie.name = apiMovie.name;
              movie.streamType = apiMovie.stream_type;
              movie.streamIcon = apiMovie.stream_icon || undefined;
              movie.rating = apiMovie.rating || undefined;
              movie.rating5based = apiMovie.rating_5based || undefined;
              movie.categoryId = apiMovie.category_id || '';
              movie.categoryIds = JSON.stringify(apiMovie.category_ids || []);
              movie.added = apiMovie.added || undefined;
              movie.containerExtension = apiMovie.container_extension || undefined;
              movie.customSid = apiMovie.custom_sid || undefined;
              movie.directSource = apiMovie.direct_source || undefined;
              movie.cachedAt = new Date();
            })
          );
        }

        // Silinecek filmleri işaretle
        for (const movieToDelete of moviesToDelete) {
          batchActions.push(movieToDelete.prepareDestroyPermanently());
        }

        // 5. Atomic batch işlem
        if (batchActions.length > 0) {
          await db.batch(...batchActions);
          console.log(`✅ Batch operation completed: ${batchActions.length} changes`);
        }
      });
    } catch (error) {
      console.error('❌ Movies sync error:', error);
      throw error;
    }
  }

  /**
   * Dizileri senkronize et
   */
  private async syncSeries(): Promise<void> {
    if (!database) {
      console.warn('⚠️ Database not initialized, skipping series sync');
      return;
    }

    try {
      // 1. API'den tüm dizileri çek
      console.log('📡 Fetching series from API...');
      const apiSeries = await seriesService.getSeries();
      console.log(`📦 Fetched ${apiSeries.length} series from API`);

      // 2. WatermelonDB'den mevcut dizi ID'lerini çek
      if (!database) {
        console.warn('⚠️ Database not available');
        return;
      }

      const localSeries = await database
        .get<SeriesModel>('series')
        .query()
        .fetch();
      const localSeriesIds = new Set(localSeries.map(s => s.seriesId.toString()));
      console.log(`💾 Found ${localSeriesIds.size} series in local database`);

      // 3. Delta bulma
      const apiSeriesIds = new Set(apiSeries.map(s => s.series_id.toString()));
      
      const seriesToCreate = apiSeries.filter(
        s => !localSeriesIds.has(s.series_id.toString())
      );
      const seriesToDelete = localSeries.filter(
        s => !apiSeriesIds.has(s.seriesId.toString())
      );

      console.log(`➕ ${seriesToCreate.length} series to create`);
      console.log(`➖ ${seriesToDelete.length} series to delete`);

      if (seriesToCreate.length === 0 && seriesToDelete.length === 0) {
        console.log('✅ Series are already in sync');
        return;
      }

      // 4. Batch işlemler hazırla
      if (!database) return;
      
      const db = database; // TypeScript için local variable
      await db.write(async () => {
        const batchActions: any[] = [];

        // Yeni dizileri ekle
        for (const apiSerie of seriesToCreate) {
          batchActions.push(
            db.get<SeriesModel>('series').prepareCreate((series) => {
              series.seriesId = apiSerie.series_id;
              series.name = apiSerie.name;
              series.cover = apiSerie.cover || undefined;
              series.plot = apiSerie.plot || undefined;
              series.cast = apiSerie.cast || undefined;
              series.director = apiSerie.director || undefined;
              series.genre = apiSerie.genre || undefined;
              series.releaseDate = apiSerie.releaseDate || undefined;
              series.lastModified = apiSerie.last_modified ? new Date(apiSerie.last_modified) : undefined;
              series.rating = apiSerie.rating || undefined;
              series.rating5based = apiSerie.rating_5based || undefined;
              series.backdropPath = JSON.stringify(apiSerie.backdrop_path || []);
              series.youtubeTrailer = apiSerie.youtube_trailer || undefined;
              series.episodeRunTime = apiSerie.episode_run_time || undefined;
              series.categoryId = apiSerie.category_id || '';
              series.categoryIds = JSON.stringify(apiSerie.category_ids || []);
              series.cachedAt = new Date();
            })
          );
        }

        // Silinecek dizileri işaretle
        for (const seriesToDeleteItem of seriesToDelete) {
          batchActions.push(seriesToDeleteItem.prepareDestroyPermanently());
        }

        // 5. Atomic batch işlem
        if (batchActions.length > 0) {
          await db.batch(...batchActions);
          console.log(`✅ Batch operation completed: ${batchActions.length} changes`);
        }
      });
    } catch (error) {
      console.error('❌ Series sync error:', error);
      throw error;
    }
  }

  /**
   * Kanalları senkronize et
   */
  private async syncChannels(): Promise<void> {
    if (!database) {
      console.warn('⚠️ Database not initialized, skipping channels sync');
      return;
    }

    try {
      // 1. API'den tüm kanalları çek
      console.log('📡 Fetching channels from API...');
      const apiChannels = await channelService.getChannels();
      console.log(`📦 Fetched ${apiChannels.length} channels from API`);

      // 2. WatermelonDB'den mevcut kanal ID'lerini çek
      if (!database) {
        console.warn('⚠️ Database not available');
        return;
      }

      const localChannels = await database
        .get<ChannelModel>('channels')
        .query()
        .fetch();
      const localChannelIds = new Set(localChannels.map(c => c.streamId.toString()));
      console.log(`💾 Found ${localChannelIds.size} channels in local database`);

      // 3. Delta bulma
      const apiChannelIds = new Set(apiChannels.map(c => c.stream_id.toString()));
      
      const channelsToCreate = apiChannels.filter(
        c => !localChannelIds.has(c.stream_id.toString())
      );
      const channelsToDelete = localChannels.filter(
        c => !apiChannelIds.has(c.streamId.toString())
      );

      console.log(`➕ ${channelsToCreate.length} channels to create`);
      console.log(`➖ ${channelsToDelete.length} channels to delete`);

      if (channelsToCreate.length === 0 && channelsToDelete.length === 0) {
        console.log('✅ Channels are already in sync');
        return;
      }

      // 4. Batch işlemler hazırla
      if (!database) return;
      
      const db = database; // TypeScript için local variable
      await db.write(async () => {
        const batchActions: any[] = [];

        // Yeni kanalları ekle
        for (const apiChannel of channelsToCreate) {
          batchActions.push(
            db.get<ChannelModel>('channels').prepareCreate((channel) => {
              channel.streamId = apiChannel.stream_id;
              channel.name = apiChannel.name;
              channel.streamType = apiChannel.stream_type;
              channel.streamIcon = apiChannel.stream_icon || undefined;
              channel.epgChannelId = apiChannel.epg_channel_id || undefined;
              channel.categoryId = apiChannel.category_id || '';
              channel.categoryIds = JSON.stringify(apiChannel.category_ids || []);
              channel.added = apiChannel.added || undefined;
              channel.customSid = apiChannel.custom_sid || undefined;
              channel.tvArchive = apiChannel.tv_archive || undefined;
              channel.directSource = apiChannel.direct_source || undefined;
              channel.tvArchiveDuration = apiChannel.tv_archive_duration || undefined;
              channel.thumbnail = apiChannel.thumbnail || undefined;
              channel.cachedAt = new Date();
            })
          );
        }

        // Silinecek kanalları işaretle
        for (const channelToDelete of channelsToDelete) {
          batchActions.push(channelToDelete.prepareDestroyPermanently());
        }

        // 5. Atomic batch işlem
        if (batchActions.length > 0) {
          await db.batch(...batchActions);
          console.log(`✅ Batch operation completed: ${batchActions.length} changes`);
        }
      });
    } catch (error) {
      console.error('❌ Channels sync error:', error);
      throw error;
    }
  }

  /**
   * EPG programlarını senkronize et (basit versiyon)
   */
  private async syncEPG(): Promise<void> {
    // EPG senkronizasyonu daha karmaşık, şimdilik placeholder
    console.log('📡 EPG sync not implemented yet');
  }

  /**
   * Manuel senkronizasyon tetikle (force sync)
   */
  async forceSync(type: SyncType): Promise<void> {
    // Zaman damgasını sıfırla ve senkronizasyonu zorla
    const lastSyncKey = SYNC_KEYS[type.toUpperCase() as keyof typeof SYNC_KEYS];
    await storageService.removeItem(lastSyncKey);
    await this.checkAndRunSync(type);
  }
}

export default new SyncService();

