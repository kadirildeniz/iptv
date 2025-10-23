import apiClient from './api/client';
import { ENDPOINTS, buildStreamUrl } from './api/endpoints';
import { LiveCategory, LiveStream, Channel, ShortEPG, EPGListing } from './api/types';

class ChannelService {
  /**
   * Canlı TV kategorilerini getir
   */
  async getCategories(): Promise<LiveCategory[]> {
    try {
      const response = await apiClient.get<LiveCategory[]>(
        ENDPOINTS.PLAYER_API,
        { action: ENDPOINTS.ACTIONS.GET_LIVE_CATEGORIES }
      );
      return response;
    } catch (error) {
      console.error('Get categories error:', error);
      throw error;
    }
  }

  /**
   * Tüm canlı TV kanallarını getir
   */
  async getChannels(categoryId?: string): Promise<Channel[]> {
    try {
      const params: any = { action: ENDPOINTS.ACTIONS.GET_LIVE_STREAMS };
      
      if (categoryId) {
        params.category_id = categoryId;
      }

      const response = await apiClient.get<LiveStream[]>(
        ENDPOINTS.PLAYER_API,
        params
      );

      // Stream URL'lerini ekle
      return this.addStreamUrls(response);
    } catch (error) {
      console.error('Get channels error:', error);
      throw error;
    }
  }

  /**
   * Kategoriye göre kanalları getir
   */
  async getChannelsByCategory(categoryId: string): Promise<Channel[]> {
    return this.getChannels(categoryId);
  }

  /**
   * ID'ye göre kanal getir
   */
  async getChannelById(channelId: string): Promise<Channel | null> {
    try {
      const channels = await this.getChannels();
      const channel = channels.find(
        (ch) => ch.stream_id.toString() === channelId
      );
      return channel || null;
    } catch (error) {
      console.error('Get channel error:', error);
      throw error;
    }
  }

  /**
   * EPG (Elektronik Program Rehberi) getir
   */
  async getEPG(streamId: string, limit: number = 10): Promise<EPGListing[]> {
    try {
      const response = await apiClient.get<ShortEPG>(
        ENDPOINTS.PLAYER_API,
        {
          action: ENDPOINTS.ACTIONS.GET_SHORT_EPG,
          stream_id: streamId,
          limit: limit,
        }
      );

      // Response format: { "stream_id": { "epg_listings": [...] } }
      const epgData = response[streamId];
      return epgData?.epg_listings || [];
    } catch (error) {
      console.error('Get EPG error:', error);
      throw error;
    }
  }

  /**
   * Birden fazla kanal için EPG getir
   */
  async getMultipleEPG(streamIds: string[]): Promise<ShortEPG> {
    try {
      const response = await apiClient.get<ShortEPG>(
        ENDPOINTS.PLAYER_API,
        {
          action: ENDPOINTS.ACTIONS.GET_SHORT_EPG,
          stream_id: streamIds.join(','),
        }
      );
      return response;
    } catch (error) {
      console.error('Get multiple EPG error:', error);
      throw error;
    }
  }

  /**
   * Stream URL'lerini ekle
   */
  private addStreamUrls(channels: LiveStream[]): Channel[] {
    const credentials = apiClient.getCredentials();
    if (!credentials) {
      return channels as Channel[];
    }

    const baseUrl = apiClient.getBaseUrl();

    return channels.map((channel) => ({
      ...channel,
      streamUrl: buildStreamUrl(
        baseUrl,
        credentials.username,
        credentials.password,
        channel.stream_id.toString(),
        'ts'
      ),
    }));
  }

  /**
   * Kanal ara (isim ile)
   */
  async searchChannels(query: string, categoryId?: string): Promise<Channel[]> {
    try {
      const channels = await this.getChannels(categoryId);
      const lowerQuery = query.toLowerCase();
      
      return channels.filter((channel) =>
        channel.name.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Search channels error:', error);
      throw error;
    }
  }
}

export default new ChannelService();
