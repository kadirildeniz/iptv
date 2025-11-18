import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';
import { schema } from './schema';
import Favorite from './models/Favorite';
import WatchHistory from './models/WatchHistory';
import ContinueWatching from './models/ContinueWatching';
import EpisodeProgress from './models/EpisodeProgress';
import Channel from './models/Channel';
import Movie from './models/Movie';
import Series from './models/Series';
import EpgProgram from './models/EpgProgram';

let database: Database | null = null;

try {
  // SQLite adapter oluştur
  const adapter = new SQLiteAdapter({
    schema,
    dbName: 'iptv_db',
    migrations: [],
    jsi: Platform.OS === 'ios', // iOS için JSI kullan (daha hızlı)
    onSetUpError: (error) => {
      console.error('❌ Database setup error:', error);
    },
  });

  // Database instance oluştur
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
    ],
  });

  // Database'in hazır olduğunu kontrol et
  database.adapter.schema.validate().then(() => {
    console.log('✅ Database schema validated');
  }).catch((error) => {
    console.error('❌ Database schema validation error:', error);
  });
} catch (error) {
  console.error('❌ Database initialization error:', error);
  console.warn('⚠️ Database will not be available. Please install expo-sqlite: npm install expo-sqlite');
}

export { database };
export default database;

