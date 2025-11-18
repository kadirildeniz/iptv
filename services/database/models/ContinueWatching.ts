import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class ContinueWatching extends Model {
  static table = 'continue_watching';

  @text('item_id') itemId!: string;
  @text('item_type') itemType!: string;
  @text('title') title!: string;
  @text('poster') poster?: string;
  @text('cover') cover?: string;
  @field('progress') progress!: number;
  @field('current_time') currentTime!: number;
  @field('duration') duration!: number;
  @date('updated_at') updatedAt!: Date;
}

