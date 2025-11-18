import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class Channel extends Model {
  static table = 'channels';

  @field('stream_id') streamId!: number;
  @text('name') name!: string;
  @text('stream_type') streamType!: string;
  @text('stream_icon') streamIcon?: string;
  @text('epg_channel_id') epgChannelId?: string;
  @text('category_id') categoryId!: string;
  @text('category_ids') categoryIds?: string;
  @text('added') added?: string;
  @text('custom_sid') customSid?: string;
  @field('tv_archive') tvArchive?: number;
  @text('direct_source') directSource?: string;
  @field('tv_archive_duration') tvArchiveDuration?: number;
  @text('thumbnail') thumbnail?: string;
  @date('cached_at') cachedAt!: Date;
}

