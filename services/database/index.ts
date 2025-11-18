// index.ts – %100 çalışan son hali (2025 Expo + WatermelonDB 0.28)

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
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
  const adapter = new SQLiteAdapter({
    schema,
    dbName: 'iptv_db',
    // migrations SATIRINI TAMAMEN KALDIR! (version 1 olduğu için gerek yok)
    jsi: false,  // <--- HER İKİ PLATFORMDA DA false OLACAK! (disableJsi: true yaptın)
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
    ],
  });

  console.log('✅ WatermelonDB başarıyla başlatıldı');
} catch (error) {
  console.error('❌ Database initialization error:', error);
}

export { database };
export default database;