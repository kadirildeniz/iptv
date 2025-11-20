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
  
  // Detay bilgileri
  @text('plot') plot?: string;
  @text('cast') cast?: string;
  @text('director') director?: string;
  @text('genre') genre?: string;
  @text('release_date') releaseDate?: string;
  @text('duration') duration?: string;
  @text('duration_secs') durationSecs?: string;
  @text('backdrop_path') backdropPath?: string;
  @text('youtube_trailer') youtubeTrailer?: string;
  @text('tmdb_id') tmdbId?: string;
  @text('country') country?: string;
  @text('age_rating') ageRating?: string;
  
  @date('cached_at') cachedAt!: Date;
}
