import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class EpisodeProgress extends Model {
  static table = 'episode_progress';

  @text('series_id') seriesId!: string;
  @field('season_number') seasonNumber!: number;
  @field('episode_number') episodeNumber!: number;
  @text('episode_id') episodeId!: string;
  @text('title') title?: string;
  @field('progress') progress!: number;
  @field('current_time') currentTime!: number;
  @field('duration') duration!: number;
  @field('watched') watched!: boolean;
  @date('updated_at') updatedAt!: Date;
}

