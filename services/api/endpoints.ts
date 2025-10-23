// Xtream Codes API Endpoints

export const ENDPOINTS = {
  // Base endpoint
  PLAYER_API: '/player_api.php',

  // Actions (Xtream Codes API parametreleri)
  ACTIONS: {
    // Authentication & User Info
    GET_ACCOUNT_INFO: 'get_account_info',
    
    // Live TV
    GET_LIVE_CATEGORIES: 'get_live_categories',
    GET_LIVE_STREAMS: 'get_live_streams',
    
    // Movies (VOD)
    GET_VOD_CATEGORIES: 'get_vod_categories',
    GET_VOD_STREAMS: 'get_vod_streams',
    GET_VOD_INFO: 'get_vod_info',
    
    // Series
    GET_SERIES_CATEGORIES: 'get_series_categories',
    GET_SERIES: 'get_series',
    GET_SERIES_INFO: 'get_series_info',
    
    // EPG
    GET_SHORT_EPG: 'get_short_epg',
    GET_SIMPLE_DATA_TABLE: 'get_simple_data_table',
  },
};

// Helper functions for building URLs
export const buildStreamUrl = (
  baseUrl: string,
  username: string,
  password: string,
  streamId: string,
  extension: string = 'ts'
): string => {
  return `${baseUrl}/live/${username}/${password}/${streamId}.${extension}`;
};

export const buildMovieUrl = (
  baseUrl: string,
  username: string,
  password: string,
  movieId: string,
  extension: string = 'mp4'
): string => {
  return `${baseUrl}/movie/${username}/${password}/${movieId}.${extension}`;
};

export const buildSeriesUrl = (
  baseUrl: string,
  username: string,
  password: string,
  episodeId: string,
  extension: string = 'mp4'
): string => {
  return `${baseUrl}/series/${username}/${password}/${episodeId}.${extension}`;
};


