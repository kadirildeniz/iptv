import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';

export const createAdapter = (migrations: any) => {
    return new SQLiteAdapter({
        schema,
        migrations,
        dbName: 'iptv_db',
        jsi: false,
        onSetUpError: (error) => {
            console.error('❌ Database setup error:', error);
        },
    });
};