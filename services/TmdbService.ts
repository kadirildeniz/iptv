import axios from 'axios';

// TODO: Replace with user's TMDB API Key or load from env
const TMDB_API_KEY = '2dea44ae74bac30900ed5a498c085bc3';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

class TmdbService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Cleans the movie title by removing year, quality, language tags, etc.
     * Example: "Matrix (2023) [TR Dublaj] 1080p" -> "Matrix"
     */
    private cleanMovieTitle(title: string): string {
        if (!title) return '';

        let cleanTitle = title;

        // 1. Remove content in parentheses () and brackets []
        cleanTitle = cleanTitle.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');

        // 2. Remove common quality and language keywords (case insensitive)
        const keywordsToRemove = [
            '1080p', '720p', '480p', '4k', 'uhd', 'hd',
            'tr', 'dublaj', 'altyazı', 'altyazi', 'türkçe', 'turkce',
            'eng', 'english', 'dual', 'web-dl', 'bluray', 'rip', 'x264', 'x265', 'hevc'
        ];

        const regex = new RegExp(`\\b(${keywordsToRemove.join('|')})\\b`, 'gi');
        cleanTitle = cleanTitle.replace(regex, '');

        // 3. Remove year if it appears as a standalone number (e.g. 1999, 2023)
        cleanTitle = cleanTitle.replace(/\b(19|20)\d{2}\b/g, '');

        // 4. Clean up extra spaces and special characters
        cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();

        // Remove trailing hyphens or special chars that might be left over
        cleanTitle = cleanTitle.replace(/^[\W_]+|[\W_]+$/g, '');

        return cleanTitle;
    }

    /**
     * Searches for a movie on TMDB and returns the YouTube trailer key.
     */
    async getTrailerVideo(movieTitle: string): Promise<string | null> {
        try {
            const cleanTitle = this.cleanMovieTitle(movieTitle);
            console.log(`[TmdbService] Original: "${movieTitle}" -> Clean: "${cleanTitle}"`);

            if (!cleanTitle) return null;

            // 1. Search for the movie
            const searchResponse = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
                params: {
                    api_key: this.apiKey,
                    query: cleanTitle,
                    language: 'tr-TR', // Prefer Turkish results, but fallback is usually English
                    page: 1,
                },
            });

            const results = searchResponse.data.results;
            if (!results || results.length === 0) {
                console.log('[TmdbService] No movie found for:', cleanTitle);
                return null;
            }

            // Take the first result
            const movieId = results[0].id;

            // 2. Get videos for the movie
            const videosResponse = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}/videos`, {
                params: {
                    api_key: this.apiKey,
                    // language: 'tr-TR', // We might want to try Turkish first, then English if no trailer found?
                    // For now let's not restrict language to get more results, or maybe try 'en-US' if 'tr-TR' fails.
                    // TMDB often returns mixed languages if not specified or if fallback is used.
                },
            });

            const videos = videosResponse.data.results;

            // Filter for Trailer on YouTube
            // Priority: Official Trailer > Trailer > Teaser
            let trailer = videos.find((v: any) =>
                v.site === 'YouTube' && v.type === 'Trailer'
            );

            if (!trailer) {
                // Fallback to Teaser if no Trailer
                trailer = videos.find((v: any) =>
                    v.site === 'YouTube' && v.type === 'Teaser'
                );
            }

            if (trailer) {
                return trailer.key;
            }

            return null;

        } catch (error) {
            console.error('[TmdbService] Error fetching trailer:', error);
            return null;
        }
    }
}

// Export a singleton instance
export const tmdbService = new TmdbService(TMDB_API_KEY);
export default tmdbService;
