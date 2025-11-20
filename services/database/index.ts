// index.ts – %100 çalışan son hali (2025 Expo + WatermelonDB 0.28)

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';
import Favorite from './models/Favorite';
import WatchHistory from './models/WatchHistory';
import ContinueWatching from './models/ContinueWatching';
import EpisodeProgress from './models/EpisodeProgress';
import Channel from './models/Channel';
import Movie from './models/Movie';
import Series from './models/Series';
import EpgProgram from './models/EpgProgram';
import LiveCategory from './models/LiveCategory';
import MovieCategory from './models/MovieCategory';
import SeriesCategory from './models/SeriesCategory';

let database: Database | null = null;

try {
  const migrations = schemaMigrations({
    migrations: [
      {
        toVersion: 2,
        steps: [
          addColumns({
            table: 'series',
            columns: [
              { name: 'seasons', type: 'string', isOptional: true },
              { name: 'episodes', type: 'string', isOptional: true },
            ],
          }),
        ],
      },
      {
        toVersion: 3,
        steps: [
          createTable({
            name: 'live_categories',
            columns: [
              { name: 'category_id', type: 'string', isIndexed: true },
              { name: 'category_name', type: 'string' },
              { name: 'cached_at', type: 'number' },
            ],
          }),
        ],
      },
      {
        toVersion: 4,
        steps: [
          createTable({
            name: 'movie_categories',
            columns: [
              { name: 'category_id', type: 'string', isIndexed: true },
              { name: 'category_name', type: 'string' },
              { name: 'cached_at', type: 'number' },
            ],
          }),
          createTable({
            name: 'series_categories',
            columns: [
              { name: 'category_id', type: 'string', isIndexed: true },
              { name: 'category_name', type: 'string' },
              { name: 'cached_at', type: 'number' },
            ],
          }),
        ],
      },
      {
        toVersion: 5,
        steps: [
          addColumns({
            table: 'movies',
            columns: [
              { name: 'plot', type: 'string', isOptional: true },
              { name: 'cast', type: 'string', isOptional: true },
              { name: 'director', type: 'string', isOptional: true },
              { name: 'genre', type: 'string', isOptional: true },
              { name: 'release_date', type: 'string', isOptional: true },
              { name: 'duration', type: 'string', isOptional: true },
              { name: 'duration_secs', type: 'string', isOptional: true },
              { name: 'backdrop_path', type: 'string', isOptional: true },
              { name: 'youtube_trailer', type: 'string', isOptional: true },
              { name: 'tmdb_id', type: 'string', isOptional: true },
              { name: 'country', type: 'string', isOptional: true },
              { name: 'age_rating', type: 'string', isOptional: true },
            ],
          }),
        ],
      },
    ],
  });

  const adapter = new SQLiteAdapter({
    schema,
    migrations,
    dbName: 'iptv_db',
    jsi: false,
    onSetUpError: (error) => {
      console.error('❌ Database setup error:', error);
    },
  });

  database = new Database({
    adapter,
    modelClasses: [
      Favorite,
      WatchHistory,
      ContinueWatching,
      EpisodeProgress,
      Channel,
      Movie,
      Series,
      EpgProgram,
      LiveCategory,
      MovieCategory,
      SeriesCategory,
    ],
  });

  console.log('✅ WatermelonDB başarıyla başlatıldı');
} catch (error) {
  console.error('❌ Database initialization error:', error);
}

export { database };
export default database;
