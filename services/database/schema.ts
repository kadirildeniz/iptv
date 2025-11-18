import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Favoriler tablosu
    tableSchema({
      name: 'favorites',
      columns: [
        { name: 'item_id', type: 'string', isIndexed: true },
        { name: 'item_type', type: 'string' }, // 'movie', 'series', 'channel'
        { name: 'title', type: 'string' },
        { name: 'poster', type: 'string', isOptional: true },
        { name: 'cover', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // Kanallar tablosu
    tableSchema({
      name: 'channels',
      columns: [
        { name: 'stream_id', type: 'number', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'stream_type', type: 'string' },
        { name: 'stream_icon', type: 'string', isOptional: true },
        { name: 'epg_channel_id', type: 'string', isOptional: true },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'category_ids', type: 'string', isOptional: true }, // JSON array
        { name: 'added', type: 'string', isOptional: true },
        { name: 'custom_sid', type: 'string', isOptional: true },
        { name: 'tv_archive', type: 'number', isOptional: true },
        { name: 'direct_source', type: 'string', isOptional: true },
        { name: 'tv_archive_duration', type: 'number', isOptional: true },
        { name: 'thumbnail', type: 'string', isOptional: true },
        { name: 'cached_at', type: 'number' },
      ],
    }),
    // Filmler tablosu
    tableSchema({
      name: 'movies',
      columns: [
        { name: 'stream_id', type: 'number', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'stream_type', type: 'string' },
        { name: 'stream_icon', type: 'string', isOptional: true },
        { name: 'rating', type: 'string', isOptional: true },
        { name: 'rating_5based', type: 'number', isOptional: true },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'category_ids', type: 'string', isOptional: true }, // JSON array
        { name: 'added', type: 'string', isOptional: true },
        { name: 'container_extension', type: 'string', isOptional: true },
        { name: 'custom_sid', type: 'string', isOptional: true },
        { name: 'direct_source', type: 'string', isOptional: true },
        { name: 'cached_at', type: 'number' },
      ],
    }),
    // Diziler tablosu
    tableSchema({
      name: 'series',
      columns: [
        { name: 'series_id', type: 'number', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'cover', type: 'string', isOptional: true },
        { name: 'plot', type: 'string', isOptional: true },
        { name: 'cast', type: 'string', isOptional: true },
        { name: 'director', type: 'string', isOptional: true },
        { name: 'genre', type: 'string', isOptional: true },
        { name: 'release_date', type: 'string', isOptional: true },
        { name: 'last_modified', type: 'number', isOptional: true },
        { name: 'rating', type: 'string', isOptional: true },
        { name: 'rating_5based', type: 'number', isOptional: true },
        { name: 'backdrop_path', type: 'string', isOptional: true }, // JSON array
        { name: 'youtube_trailer', type: 'string', isOptional: true },
        { name: 'episode_run_time', type: 'string', isOptional: true },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'category_ids', type: 'string', isOptional: true }, // JSON array
        { name: 'cached_at', type: 'number' },
      ],
    }),
    // EPG Programları tablosu
    tableSchema({
      name: 'epg_programs',
      columns: [
        { name: 'epg_id', type: 'string', isIndexed: true },
        { name: 'channel_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'start_timestamp', type: 'number', isIndexed: true },
        { name: 'stop_timestamp', type: 'number' },
        { name: 'start', type: 'string', isOptional: true },
        { name: 'end', type: 'string', isOptional: true },
        { name: 'lang', type: 'string', isOptional: true },
        { name: 'now_playing', type: 'number', isOptional: true },
        { name: 'has_archive', type: 'number', isOptional: true },
        { name: 'cached_at', type: 'number' },
      ],
    }),
    // İzleme geçmişi tablosu
    tableSchema({
      name: 'watch_history',
      columns: [
        { name: 'item_id', type: 'string', isIndexed: true },
        { name: 'item_type', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'poster', type: 'string', isOptional: true },
        { name: 'watched_at', type: 'number' },
        { name: 'duration', type: 'number', isOptional: true },
        { name: 'progress', type: 'number', isOptional: true }, // 0-100
      ],
    }),
    // İzlemeye devam et tablosu
    tableSchema({
      name: 'continue_watching',
      columns: [
        { name: 'item_id', type: 'string', isIndexed: true },
        { name: 'item_type', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'poster', type: 'string', isOptional: true },
        { name: 'cover', type: 'string', isOptional: true },
        { name: 'progress', type: 'number' }, // 0-100
        { name: 'current_time', type: 'number' }, // saniye cinsinden
        { name: 'duration', type: 'number' }, // saniye cinsinden
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // Dizi bölümleri izleme durumu
    tableSchema({
      name: 'episode_progress',
      columns: [
        { name: 'series_id', type: 'string', isIndexed: true },
        { name: 'season_number', type: 'number' },
        { name: 'episode_number', type: 'number' },
        { name: 'episode_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string', isOptional: true },
        { name: 'progress', type: 'number' }, // 0-100
        { name: 'current_time', type: 'number' }, // saniye cinsinden
        { name: 'duration', type: 'number' }, // saniye cinsinden
        { name: 'watched', type: 'boolean' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});

