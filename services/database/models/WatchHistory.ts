import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class WatchHistory extends Model {
  static table = 'watch_history';

  @text('item_id') itemId!: string;
  @text('item_type') itemType!: string;
  @text('title') title!: string;
  @text('poster') poster?: string;
  @field('duration') duration?: number;
  @field('progress') progress?: number;
  @date('watched_at') watchedAt!: Date;
}

