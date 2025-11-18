// Xtream Codes API Response Types

// ============================================
// User & Account Info
// ============================================

export interface UserInfo {
  username: string;
  password: string;
  message: string;
  auth: number;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
}

export interface ServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
}

export interface AccountInfo {
  user_info: UserInfo;
  server_info: ServerInfo;
}

// ============================================
// Category Types
// ============================================

export interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface LiveCategory extends Category {}
export interface VodCategory extends Category {}
export interface SeriesCategory extends Category {}

// ============================================
// Live TV / Channels
// ============================================

export interface LiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
  category_id: string;
  category_ids: number[];
  thumbnail: string;
}

export interface EPGListing {
  id: string;
  epg_id: string;
  title: string;
  lang: string;
  start: string;
  end: string;
  description: string;
  channel_id: string;
  start_timestamp: number;
  stop_timestamp: number;
  now_playing: number;
  has_archive: number;
}

export interface ShortEPG {
  [streamId: string]: {
    epg_listings: EPGListing[];
  };
}

// ============================================
// Movies (VOD)
// ============================================

export interface VodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  category_ids: number[];
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface VodInfo {
  info: {
    kinopoisk_url: string;
    tmdb_id: string;
    name: string;
    o_name: string;
    cover_big: string;
    movie_image: string;
    releasedate: string;
    episode_run_time: string;
    youtube_trailer: string;
    director: string;
    actors: string;
    cast: string;
    description: string;
    plot: string;
    age: string;
    mpaa_rating: string;
    rating_count_kinopoisk: number;
    country: string;
    genre: string;
    duration_secs: number;
    duration: string;
    video: {
      index: number;
      codec_name: string;
      codec_long_name: string;
      profile: string;
      codec_type: string;
      codec_time_base: string;
      codec_tag_string: string;
      codec_tag: string;
      width: number;
      height: number;
      coded_width: number;
      coded_height: number;
      has_b_frames: number;
      sample_aspect_ratio: string;
      display_aspect_ratio: string;
      pix_fmt: string;
      level: number;
      r_frame_rate: string;
      avg_frame_rate: string;
      time_base: string;
      start_pts: number;
      start_time: string;
      bits_per_raw_sample: string;
      disposition: any;
      tags: any;
    };
    audio: {
      index: number;
      codec_name: string;
      codec_long_name: string;
      profile: string;
      codec_type: string;
      codec_time_base: string;
      codec_tag_string: string;
      codec_tag: string;
      sample_fmt: string;
      sample_rate: string;
      channels: number;
      channel_layout: string;
      bits_per_sample: number;
      r_frame_rate: string;
      avg_frame_rate: string;
      time_base: string;
      start_pts: number;
      start_time: string;
      bit_rate: string;
      disposition: any;
      tags: any;
    };
    bitrate: number;
  };
  movie_data: {
    stream_id: number;
    name: string;
    added: string;
    category_id: string;
    category_ids: string[];
    container_extension: string;
    custom_sid: string;
    direct_source: string;
  };
}

// ============================================
// Series
// ============================================

export interface Series {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
  category_ids: number[];
}

export interface SeriesInfo {
  seasons: Season[];
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    last_modified: string;
    rating: string;
    rating_5based: number;
    backdrop_path: string[];
    youtube_trailer: string;
    episode_run_time: string;
    category_id: string;
    category_ids: string[];
    tmdb_id: string;
  };
  episodes: {
    [seasonNumber: string]: Episode[];
  };
}

export interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  season_number: number;
  cover: string;
  cover_big: string;
}

export interface Episode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info: {
    tmdb_id: number;
    releasedate: string;
    plot: string;
    duration_secs: number;
    duration: string;
    movie_image: string;
    bitrate: number;
    rating: string;
    season: number;
    video: any;
    audio: any;
  };
  custom_sid: string;
  added: string;
  season: number;
  direct_source: string;
  streamUrl?: string;
}

// ============================================
// Helper Types
// ============================================

export interface StreamResponse<T> {
  data: T[];
}

// Local types for app usage
export interface Channel extends LiveStream {
  streamUrl?: string;
}

export interface Movie extends VodStream {
  streamUrl?: string;
  info?: VodInfo['info'];
}

export interface Favorite {
  id: string;
  userId: string;
  itemId: string;
  itemType: 'channel' | 'movie' | 'series';
  createdAt: string;
}

export interface WatchHistory {
  id: string;
  itemId: string;
  itemType: 'channel' | 'movie' | 'episode';
  title: string;
  poster?: string;
  watchedAt: string;
}

export interface ContinueWatching {
  id: string;
  itemId: string;
  itemType: 'movie' | 'episode';
  title: string;
  poster?: string;
  progress: number;
  duration: number;
  currentTime: number;
  updatedAt: string;
}
