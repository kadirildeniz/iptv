import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class SeriesCategory extends Model {
  static table = 'series_categories';

  @field('category_id') categoryId!: string;
  @field('category_name') categoryName!: string;
  @field('cached_at') cachedAt!: number;
}

