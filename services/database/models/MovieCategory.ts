import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class MovieCategory extends Model {
  static table = 'movie_categories';

  @field('category_id') categoryId!: string;
  @field('category_name') categoryName!: string;
  @field('cached_at') cachedAt!: number;
}

