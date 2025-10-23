import apiClient from './api/client';
import { ENDPOINTS, buildSeriesUrl } from './api/endpoints';
import { SeriesCategory, Series, SeriesInfo, Episode } from './api/types';

class SeriesService {
  /**
   * Dizi kategorilerini getir
   */
  async getCategories(): Promise<SeriesCategory[]> {
    try {
      const response = await apiClient.get<SeriesCategory[]>(
        ENDPOINTS.PLAYER_API,
        { action: ENDPOINTS.ACTIONS.GET_SERIES_CATEGORIES }
      );
      return response;
    } catch (error) {
      console.error('Get categories error:', error);
      throw error;
    }
  }

  /**
   * Tüm dizileri getir
   */
  async getSeries(categoryId?: string): Promise<Series[]> {
    try {
      const params: any = { action: ENDPOINTS.ACTIONS.GET_SERIES };
      
      if (categoryId) {
        params.category_id = categoryId;
      }

      const response = await apiClient.get<Series[]>(
        ENDPOINTS.PLAYER_API,
        params
      );

      return response;
    } catch (error) {
      console.error('Get series error:', error);
      throw error;
    }
  }

  /**
   * Kategoriye göre dizileri getir
   */
  async getSeriesByCategory(categoryId: string): Promise<Series[]> {
    return this.getSeries(categoryId);
  }

  /**
   * ID'ye göre dizi getir
   */
  async getSeriesById(seriesId: string): Promise<Series | null> {
    try {
      const series = await this.getSeries();
      const found = series.find(
        (s) => s.series_id.toString() === seriesId
      );
      return found || null;
    } catch (error) {
      console.error('Get series error:', error);
      throw error;
    }
  }

  /**
   * Dizi detay bilgilerini getir (sezonlar ve bölümler)
   */
  async getSeriesInfo(seriesId: string): Promise<SeriesInfo> {
    try {
      const response = await apiClient.get<SeriesInfo>(
        ENDPOINTS.PLAYER_API,
        {
          action: ENDPOINTS.ACTIONS.GET_SERIES_INFO,
          series_id: seriesId,
        }
      );

      // Bölümlere stream URL'lerini ekle
      return this.addEpisodeUrls(response);
    } catch (error) {
      console.error('Get series info error:', error);
      throw error;
    }
  }

  /**
   * Sezonun bölümlerini getir
   */
  async getEpisodesBySeason(seriesId: string, seasonNumber: number): Promise<Episode[]> {
    try {
      const seriesInfo = await this.getSeriesInfo(seriesId);
      return seriesInfo.episodes[seasonNumber] || [];
    } catch (error) {
      console.error('Get episodes error:', error);
      throw error;
    }
  }

  /**
   * Dizi ara (isim ile)
   */
  async searchSeries(query: string, categoryId?: string): Promise<Series[]> {
    try {
      const series = await this.getSeries(categoryId);
      const lowerQuery = query.toLowerCase();
      
      return series.filter((s) =>
        s.name.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Search series error:', error);
      throw error;
    }
  }

  /**
   * Popüler dizileri getir (rating'e göre sıralı)
   */
  async getPopularSeries(categoryId?: string, limit: number = 20): Promise<Series[]> {
    try {
      const series = await this.getSeries(categoryId);
      
      // Rating'e göre sırala ve limitle
      return series
        .sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Get popular series error:', error);
      throw error;
    }
  }

  /**
   * Son eklenen dizileri getir
   */
  async getRecentSeries(categoryId?: string, limit: number = 20): Promise<Series[]> {
    try {
      const series = await this.getSeries(categoryId);
      
      // Eklenme tarihine göre sırala ve limitle
      return series
        .sort((a, b) => {
          const dateA = new Date(a.last_modified || 0).getTime();
          const dateB = new Date(b.last_modified || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Get recent series error:', error);
      throw error;
    }
  }

  /**
   * Bölümlere stream URL'lerini ekle
   */
  private addEpisodeUrls(seriesInfo: SeriesInfo): SeriesInfo {
    const credentials = apiClient.getCredentials();
    if (!credentials) {
      return seriesInfo;
    }

    const baseUrl = apiClient.getBaseUrl();
    const episodes: { [seasonNumber: string]: Episode[] } = {};

    // Her sezonun bölümlerine URL ekle
    Object.keys(seriesInfo.episodes).forEach((seasonKey) => {
      episodes[seasonKey] = seriesInfo.episodes[seasonKey].map((episode) => ({
        ...episode,
        streamUrl: buildSeriesUrl(
          baseUrl,
          credentials.username,
          credentials.password,
          episode.id,
          episode.container_extension || 'mp4'
        ),
      }));
    });

    return {
      ...seriesInfo,
      episodes,
    };
  }
}

export default new SeriesService();
