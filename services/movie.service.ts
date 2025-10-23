import apiClient from './api/client';
import { ENDPOINTS, buildMovieUrl } from './api/endpoints';
import { VodCategory, VodStream, VodInfo, Movie } from './api/types';

class MovieService {
  /**
   * Film kategorilerini getir
   */
  async getCategories(): Promise<VodCategory[]> {
    try {
      const response = await apiClient.get<VodCategory[]>(
        ENDPOINTS.PLAYER_API,
        { action: ENDPOINTS.ACTIONS.GET_VOD_CATEGORIES }
      );
      return response;
    } catch (error) {
      console.error('Get categories error:', error);
      throw error;
    }
  }

  /**
   * Tüm filmleri getir
   */
  async getMovies(categoryId?: string): Promise<Movie[]> {
    try {
      const params: any = { action: ENDPOINTS.ACTIONS.GET_VOD_STREAMS };
      
      if (categoryId) {
        params.category_id = categoryId;
      }

      const response = await apiClient.get<VodStream[]>(
        ENDPOINTS.PLAYER_API,
        params
      );

      // Stream URL'lerini ekle
      return this.addStreamUrls(response);
    } catch (error) {
      console.error('Get movies error:', error);
      throw error;
    }
  }

  /**
   * Kategoriye göre filmleri getir
   */
  async getMoviesByCategory(categoryId: string): Promise<Movie[]> {
    return this.getMovies(categoryId);
  }

  /**
   * ID'ye göre film getir
   */
  async getMovieById(movieId: string): Promise<Movie | null> {
    try {
      const movies = await this.getMovies();
      const movie = movies.find(
        (m) => m.stream_id.toString() === movieId
      );
      return movie || null;
    } catch (error) {
      console.error('Get movie error:', error);
      throw error;
    }
  }

  /**
   * Film detay bilgilerini getir
   */
  async getMovieInfo(vodId: string): Promise<VodInfo> {
    try {
      const response = await apiClient.get<VodInfo>(
        ENDPOINTS.PLAYER_API,
        {
          action: ENDPOINTS.ACTIONS.GET_VOD_INFO,
          vod_id: vodId,
        }
      );
      return response;
    } catch (error) {
      console.error('Get movie info error:', error);
      throw error;
    }
  }

  /**
   * Film ara (isim ile)
   */
  async searchMovies(query: string, categoryId?: string): Promise<Movie[]> {
    try {
      const movies = await this.getMovies(categoryId);
      const lowerQuery = query.toLowerCase();
      
      return movies.filter((movie) =>
        movie.name.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Search movies error:', error);
      throw error;
    }
  }

  /**
   * Popüler filmleri getir (rating'e göre sıralı)
   */
  async getPopularMovies(categoryId?: string, limit: number = 20): Promise<Movie[]> {
    try {
      const movies = await this.getMovies(categoryId);
      
      // Rating'e göre sırala ve limitle
      return movies
        .sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Get popular movies error:', error);
      throw error;
    }
  }

  /**
   * Son eklenen filmleri getir
   */
  async getRecentMovies(categoryId?: string, limit: number = 20): Promise<Movie[]> {
    try {
      const movies = await this.getMovies(categoryId);
      
      // Eklenme tarihine göre sırala ve limitle
      return movies
        .sort((a, b) => {
          const dateA = new Date(a.added || 0).getTime();
          const dateB = new Date(b.added || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Get recent movies error:', error);
      throw error;
    }
  }

  /**
   * Stream URL'lerini ekle
   */
  private addStreamUrls(movies: VodStream[]): Movie[] {
    const credentials = apiClient.getCredentials();
    if (!credentials) {
      return movies as Movie[];
    }

    const baseUrl = apiClient.getBaseUrl();

    return movies.map((movie) => ({
      ...movie,
      streamUrl: buildMovieUrl(
        baseUrl,
        credentials.username,
        credentials.password,
        movie.stream_id.toString(),
        movie.container_extension || 'mp4'
      ),
    }));
  }
}

export default new MovieService();
