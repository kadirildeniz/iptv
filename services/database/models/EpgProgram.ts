import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class EpgProgram extends Model {
  static table = 'epg_programs';

  @text('epg_id') epgId!: string;
  @text('channel_id') channelId!: string;
  @text('title') title!: string;
  @text('description') description?: string;
  @field('start_timestamp') startTimestamp!: number;
  @field('stop_timestamp') stopTimestamp!: number;
  @text('start') start?: string;
  @text('end') end?: string;
  @text('lang') lang?: string;
  @field('now_playing') nowPlaying?: number;
  @field('has_archive') hasArchive?: number;
  @date('cached_at') cachedAt!: Date;
}

