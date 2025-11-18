import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class Movie extends Model {
  static table = 'movies';

  @field('stream_id') streamId!: number;
  @text('name') name!: string;
  @text('stream_type') streamType!: string;
  @text('stream_icon') streamIcon?: string;
  @text('rating') rating?: string;
  @field('rating_5based') rating5based?: number;
  @text('category_id') categoryId!: string;
  @text('category_ids') categoryIds?: string;
  @text('added') added?: string;
  @text('container_extension') containerExtension?: string;
  @text('custom_sid') customSid?: string;
  @text('direct_source') directSource?: string;
  @date('cached_at') cachedAt!: Date;
}

