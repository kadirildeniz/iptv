import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class Series extends Model {
  static table = 'series';

  @field('series_id') seriesId!: number;
  @text('name') name!: string;
  @text('cover') cover?: string;
  @text('plot') plot?: string;
  @text('cast') cast?: string;
  @text('director') director?: string;
  @text('genre') genre?: string;
  @text('release_date') releaseDate?: string;
  @date('last_modified') lastModified?: Date;
  @text('rating') rating?: string;
  @field('rating_5based') rating5based?: number;
  @text('backdrop_path') backdropPath?: string;
  @text('youtube_trailer') youtubeTrailer?: string;
  @text('episode_run_time') episodeRunTime?: string;
  @text('category_id') categoryId!: string;
  @text('category_ids') categoryIds?: string;
  @date('cached_at') cachedAt!: Date;
}

