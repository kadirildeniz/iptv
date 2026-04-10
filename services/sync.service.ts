import { database } from './database';
import storageService from './storage.service';
import movieService from './movie.service';
import seriesService from './series.service';
import channelService from './channel.service';
import LiveCategoryModel from './database/models/LiveCategory';
import MovieCategoryModel from './database/models/MovieCategory';
import SeriesCategoryModel from './database/models/SeriesCategory';
import MovieModel from './database/models/Movie';
import SeriesModel from './database/models/Series';
import ChannelModel from './database/models/Channel';

type SyncType = 'movies' | 'series' | 'channels';
type SyncProgress = {
  type: string;
  current: number;
  total: number;
  message: string;
};

// Yardımcı fonksiyon: Bekleme süresi (Artık sadece lazy load'da kullanılabilir ama burada tutuyorum)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class SyncService {
  private isSyncing = new Map<SyncType, boolean>();
  private syncProgressCallback: ((progress: SyncProgress) => void) | null = null;

  setSyncProgressCallback(callback: (progress: SyncProgress) => void) {
    this.syncProgressCallback = callback;
  }

  removeSyncProgressCallback() {
    this.syncProgressCallback = null;
  }

  private reportProgress(progress: SyncProgress) {
    if (this.syncProgressCallback) {
      this.syncProgressCallback(progress);
    }
  }

  // Tekil sync fonksiyonları (Dışarıdan çağrılabilir)

  async syncChannelsOnly(): Promise<void> {
    if (this.isSyncing.get('channels')) throw new Error('Canlı TV güncellemesi zaten devam ediyor');
    this.isSyncing.set('channels', true);

    try {
      this.reportProgress({ type: 'channels', current: 0, total: 2, message: 'Canlı TV kategorileri güncelleniyor...' });
      await this.syncLiveCategories();

      this.reportProgress({ type: 'channels', current: 1, total: 2, message: 'Canlı TV kanalları güncelleniyor...' });
      await this.syncChannels();

      console.log('✅ Canlı TV güncellemesi tamamlandı');
    } finally {
      this.isSyncing.set('channels', false);
    }
  }

  async syncMoviesOnly(): Promise<void> {
    if (this.isSyncing.get('movies')) throw new Error('Film güncellemesi zaten devam ediyor');
    this.isSyncing.set('movies', true);

    try {
      this.reportProgress({ type: 'movies', current: 0, total: 2, message: 'Film kategorileri güncelleniyor...' });
      await this.syncMovieCategories();

      this.reportProgress({ type: 'movies', current: 1, total: 2, message: 'Filmler indiriliyor (Bulk)...' });
      await this.syncMovies();

      console.log('✅ Film güncellemesi tamamlandı');
    } finally {
      this.isSyncing.set('movies', false);
    }
  }

  async syncSeriesOnly(): Promise<void> {
    if (this.isSyncing.get('series')) throw new Error('Dizi güncellemesi zaten devam ediyor');
    this.isSyncing.set('series', true);

    try {
      this.reportProgress({ type: 'series', current: 0, total: 2, message: 'Dizi kategorileri güncelleniyor...' });
      await this.syncSeriesCategories();

      this.reportProgress({ type: 'series', current: 1, total: 2, message: 'Diziler indiriliyor (Bulk)...' });
      await this.syncSeries();

      console.log('✅ Dizi güncellemesi tamamlandı');
    } finally {
      this.isSyncing.set('series', false);
    }
  }

  /**
   * Tüm içerikleri güvenli bir şekilde sırasıyla senkronize et
   */
  async startSafeSync(): Promise<void> {
    if (Array.from(this.isSyncing.values()).some(v => v)) {
      throw new Error('Zaten bir güncelleme işlemi devam ediyor');
    }

    try {
      // 1. Kanallar
      await this.syncChannelsOnly();

      // 2. Filmler
      await this.syncMoviesOnly();

      // 3. Diziler
      await this.syncSeriesOnly();

      console.log('✅ Tüm senkronizasyon tamamlandı');
    } catch (error) {
      console.error('Safe sync error:', error);
      throw error;
    }
  }

  // --- Alt Fonksiyonlar ---

  private async syncLiveCategories(): Promise<void> {
    if (!database) throw new Error('Database yok');

    try {
      console.log('📡 Canlı TV kategorileri API\'den çekiliyor...');
      const apiCategories = await channelService.getCategories();

      const uniqueMap = new Map();
      apiCategories.forEach((cat: any) => {
        if (!uniqueMap.has(cat.category_id)) {
          uniqueMap.set(cat.category_id, cat);
        }
      });
      const uniqueCategories = Array.from(uniqueMap.values());

      const existingCategories = await database.get<LiveCategoryModel>('live_categories').query().fetch();
      const existingIds = new Set(existingCategories.map((c) => c.categoryId));

      await database.write(async () => {
        const batchActions: any[] = [];
        for (const cat of uniqueCategories as any[]) {
          if (!existingIds.has(cat.category_id)) {
            batchActions.push(
              database!.get('live_categories').prepareCreate((category: any) => {
                category.categoryId = cat.category_id;
                category.categoryName = cat.category_name;
                category.cachedAt = Date.now();
              })
            );
          }
        }
        if (batchActions.length > 0) {
          await database!.batch(...batchActions);
        }
      });
    } catch (error) {
      console.error('❌ Canlı TV kategorileri sync hatası:', error);
      throw error;
    }
  }

  private async syncMovieCategories(): Promise<void> {
    if (!database) throw new Error('Database yok');

    try {
      console.log('📡 Film kategorileri API\'den çekiliyor...');
      const apiCategories = await movieService.getCategories();

      const uniqueMap = new Map();
      apiCategories.forEach((cat: any) => {
        if (!uniqueMap.has(cat.category_id)) {
          uniqueMap.set(cat.category_id, cat);
        }
      });
      const uniqueCategories = Array.from(uniqueMap.values());

      const existingCategories = await database.get<MovieCategoryModel>('movie_categories').query().fetch();
      const existingIds = new Set(existingCategories.map((c) => c.categoryId));

      await database.write(async () => {
        const batchActions: any[] = [];
        for (const cat of uniqueCategories as any[]) {
          if (!existingIds.has(cat.category_id)) {
            batchActions.push(
              database!.get('movie_categories').prepareCreate((category: any) => {
                category.categoryId = cat.category_id;
                category.categoryName = cat.category_name;
                category.cachedAt = Date.now();
              })
            );
          }
        }
        if (batchActions.length > 0) {
          await database!.batch(...batchActions);
        }
      });
    } catch (error) {
      console.error('❌ Film kategorileri sync hatası:', error);
      throw error;
    }
  }

  private async syncSeriesCategories(): Promise<void> {
    if (!database) throw new Error('Database yok');

    try {
      console.log('📡 Dizi kategorileri API\'den çekiliyor...');
      const apiCategories = await seriesService.getCategories();

      const uniqueMap = new Map();
      apiCategories.forEach((cat: any) => {
        if (!uniqueMap.has(cat.category_id)) {
          uniqueMap.set(cat.category_id, cat);
        }
      });
      const uniqueCategories = Array.from(uniqueMap.values());

      const existingCategories = await database.get<SeriesCategoryModel>('series_categories').query().fetch();
      const existingIds = new Set(existingCategories.map((c) => c.categoryId));

      await database.write(async () => {
        const batchActions: any[] = [];
        for (const cat of uniqueCategories as any[]) {
          if (!existingIds.has(cat.category_id)) {
            batchActions.push(
              database!.get('series_categories').prepareCreate((category: any) => {
                category.categoryId = cat.category_id;
                category.categoryName = cat.category_name;
                category.cachedAt = Date.now();
              })
            );
          }
        }
        if (batchActions.length > 0) {
          await database!.batch(...batchActions);
        }
      });
    } catch (error) {
      console.error('❌ Dizi kategorileri sync hatası:', error);
      throw error;
    }
  }

  private async syncChannels(): Promise<void> {
    if (!database) throw new Error('Database yok');

    try {
      console.log('📡 Kanallar API\'den çekiliyor...');
      const apiChannels = await channelService.getChannels();

      const localChannels = await database.get<ChannelModel>('channels').query().fetch();
      const localChannelIds = new Set(localChannels.map((c) => c.streamId.toString()));

      const channelsToCreate = apiChannels.filter((c) => !localChannelIds.has(c.stream_id.toString()));
      console.log(`➕ ${channelsToCreate.length} yeni kanal eklenecek`);

      if (channelsToCreate.length === 0) {
        console.log('✅ Kanallar zaten güncel');
        return;
      }

      const batchOps: any[] = [];
      const channelsCollection = database.get<ChannelModel>('channels');

      for (const apiChannel of channelsToCreate) {
        batchOps.push(
          channelsCollection.prepareCreate((channel) => {
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

      const CHUNK_SIZE = 500;
      let processed = 0;

      while (batchOps.length > 0) {
        const chunk = batchOps.splice(0, CHUNK_SIZE);

        await database.write(async () => {
          await database!.batch(chunk);
        });

        processed += chunk.length;
        console.log(`💾 ${processed} / ${channelsToCreate.length} kanal kaydedildi...`);
      }
      console.log('✅ Tüm kanallar başarıyla kaydedildi');

    } catch (error) {
      console.error('❌ Kanallar sync hatası:', error);
      throw error;
    }
  }

  private async syncMovies(): Promise<void> {
    if (!database) throw new Error('Database yok');

    try {
      console.log('📡 Filmler API\'den çekiliyor (Bulk)...');
      const apiMovies = await movieService.getMovies();
      console.log(`📦 ${apiMovies.length} film alındı`);

      const localMovies = await database.get<MovieModel>('movies').query().fetch();
      const localMovieIds = new Set(localMovies.map((m) => m.streamId.toString()));

      const moviesToCreate = apiMovies.filter((m) => !localMovieIds.has(m.stream_id.toString()));
      console.log(`➕ ${moviesToCreate.length} yeni film eklenecek`);

      if (moviesToCreate.length === 0) {
        console.log('✅ Filmler zaten güncel');
        return;
      }

      // Kategori ID -> Kategori Adı eşleştirmesi için kategorileri al
      const movieCategories = await database.get<MovieCategoryModel>('movie_categories').query().fetch();
      const categoryMap = new Map<string, string>();
      movieCategories.forEach((cat) => {
        categoryMap.set(cat.categoryId, cat.categoryName);
      });
      console.log(`📂 ${categoryMap.size} kategori eşleştirildi`);

      const batchOps: any[] = [];
      const moviesCollection = database.get<MovieModel>('movies');

      for (const apiMovie of moviesToCreate) {
        // Kategori adını genre olarak kullan
        const categoryName = categoryMap.get(apiMovie.category_id) || '';

        batchOps.push(
          moviesCollection.prepareCreate((movie) => {
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
            // Kategori adını genre olarak kaydet
            movie.genre = categoryName || undefined;
            movie.cachedAt = new Date();
          })
        );
      }

      const CHUNK_SIZE = 500;
      let processed = 0;

      while (batchOps.length > 0) {
        const chunk = batchOps.splice(0, CHUNK_SIZE);

        await database.write(async () => {
          await database!.batch(chunk);
        });

        processed += chunk.length;
        console.log(`💾 ${processed} / ${moviesToCreate.length} film kaydedildi...`);
      }
      console.log('✅ Tüm filmler başarıyla kaydedildi');

    } catch (error) {
      console.error('❌ Filmler sync hatası:', error);
      throw error;
    }
  }

  private async syncSeries(): Promise<void> {
    if (!database) throw new Error('Database yok');

    try {
      console.log('📡 Diziler API\'den çekiliyor (Bulk)...');
      // 1. Tek büyük istek
      const apiSeries = await seriesService.getSeries();
      console.log(`📦 ${apiSeries.length} dizi alındı`);

      // 2. Mevcut verileri kontrol et
      const localSeries = await database.get<SeriesModel>('series').query().fetch();
      const localSeriesIds = new Set(localSeries.map((s) => s.seriesId.toString()));

      const seriesToCreate = apiSeries.filter((s) => !localSeriesIds.has(s.series_id.toString()));
      console.log(`➕ ${seriesToCreate.length} yeni dizi eklenecek`);

      if (seriesToCreate.length === 0) {
        console.log('✅ Diziler zaten güncel');
        return;
      }

      // 3. Batch işlemleri hazırla
      const batchOps: any[] = [];
      const seriesCollection = database.get<SeriesModel>('series');

      for (const apiSerie of seriesToCreate) {
        batchOps.push(
          seriesCollection.prepareCreate((series) => {
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
            // Detaylar BOŞ bırakılıyor - Lazy Load yapılacak
            series.seasons = undefined;
            series.episodes = undefined;
            series.cachedAt = new Date();
          })
        );
      }

      // 4. Chunking ile kaydet
      const CHUNK_SIZE = 500;
      let processed = 0;

      while (batchOps.length > 0) {
        const chunk = batchOps.splice(0, CHUNK_SIZE);

        await database.write(async () => {
          await database!.batch(chunk);
        });

        processed += chunk.length;
        console.log(`💾 ${processed} / ${seriesToCreate.length} dizi kaydedildi...`);
      }
      console.log('✅ Tüm diziler başarıyla kaydedildi');

    } catch (error) {
      console.error('❌ Diziler sync hatası:', error);
      throw error;
    }
  }
}

export default new SyncService();
