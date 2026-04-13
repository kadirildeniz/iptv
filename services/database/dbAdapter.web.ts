import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';

export const createAdapter = (migrations: any) => {
    return new LokiJSAdapter({
        schema,
        migrations,
        useWebWorker: false,
        useIncrementalIndexedDB: true,
        onSetUpError: (error) => {
            console.error('❌ Web Database setup error:', error);
        },
    });
};