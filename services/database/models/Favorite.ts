import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class Favorite extends Model {
  static table = 'favorites';

  @text('item_id') itemId!: string;
  @text('item_type') itemType!: string;
  @text('title') title!: string;
  @text('poster') poster?: string;
  @text('cover') cover?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}

