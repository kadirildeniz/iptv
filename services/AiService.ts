import Groq from 'groq-sdk';
import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import Movie from './database/models/Movie';
import Series from './database/models/Series';

// API Key'i environment variable'dan al
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

/**
 * Türkçe tür isimlerini veritabanında aranacak genre terimlerine çevir
 * NOT: Her türün kendi unique anahtar kelimeleri var, çakışma yok
 */
const GENRE_MAPPINGS: { [key: string]: string[] } = {
    'komedi': ['Comedy', 'Komedi', 'Sitcom'],
    'aksiyon': ['Action', 'Aksiyon'],
    'macera': ['Adventure', 'Macera'],
    'korku': ['Horror', 'Korku'],
    'gerilim': ['Thriller', 'Gerilim'],
    'dram': ['Drama', 'Dram', 'Melodram'],
    'romantik': ['Romance', 'Romantik', 'Aşk', 'Love'],
    'bilim kurgu': ['Sci-Fi', 'Science Fiction', 'Bilim Kurgu'],
    'fantastik': ['Fantasy', 'Fantastik', 'Fantezi'],
    'animasyon': ['Animation', 'Animasyon', 'Cartoon'],
    'anime': ['Anime'],
    'belgesel': ['Documentary', 'Belgesel'],
    'suç': ['Crime', 'Suç'],
    'polisiye': ['Mystery', 'Polisiye', 'Detective'],
    'savaş': ['War', 'Savaş'],
    'tarih': ['History', 'Tarih', 'Historical'],
    'aile': ['Family', 'Aile', 'Kids', 'Çocuk'],
    'spor': ['Sport', 'Spor'],
    'müzik': ['Music', 'Musical', 'Müzik', 'Müzikal'],
    'western': ['Western', 'Kovboy'],
};

/**
 * Doğal dil ifadelerini türlere çeviren eşleştirmeler
 * Örn: "gülmek istiyorum" -> komedi
 */
const MOOD_TO_GENRE: { [key: string]: string[] } = {
    // Güldürü istekleri
    'gülmek': ['komedi'],
    'güldür': ['komedi'],
    'eğlenceli': ['komedi'],
    'komik': ['komedi'],
    'neşeli': ['komedi'],
    'kahkaha': ['komedi'],

    // Heyecan istekleri
    'heyecan': ['aksiyon', 'gerilim'],
    'adrenalin': ['aksiyon'],
    'patla': ['aksiyon'],
    'dövüş': ['aksiyon'],

    // Sıkıntı/canı sıkılıyor
    'sıkıl': ['komedi', 'aksiyon', 'macera'],
    'canım sık': ['komedi', 'aksiyon'],
    'eğlen': ['komedi', 'macera'],

    // Korku istekleri
    'kork': ['korku'],
    'ürper': ['korku', 'gerilim'],
    'gerilim': ['gerilim', 'korku'],

    // Duygusal istekler
    'ağla': ['dram', 'romantik'],
    'duygusal': ['dram', 'romantik'],
    'hüzün': ['dram'],
    'romantik': ['romantik'],
    'aşk': ['romantik'],

    // Çocuk/aile
    'çocuk': ['aile', 'animasyon'],
    'aile': ['aile'],

    // Bilim kurgu
    'uzay': ['bilim kurgu'],
    'bilim': ['bilim kurgu'],
    'gelecek': ['bilim kurgu'],

    // Fantezi
    'büyü': ['fantastik'],
    'ejderha': ['fantastik'],
    'sihir': ['fantastik'],
};

/**
 * Kullanıcının isteğinden tür anahtar kelimelerini çıkar
 * Önce doğrudan tür ismi arar, sonra doğal dil ifadelerine bakar
 */
const extractGenreKeywords = (userPrompt: string): string[] => {
    const prompt = userPrompt.toLowerCase();
    const matchedGenres: Set<string> = new Set();

    // 1. Önce doğrudan tür ismi var mı kontrol et
    for (const turkishGenre of Object.keys(GENRE_MAPPINGS)) {
        if (prompt.includes(turkishGenre)) {
            matchedGenres.add(turkishGenre);
        }
    }

    // 2. Doğal dil ifadelerine bak (sadece tür bulunamazsa)
    if (matchedGenres.size === 0) {
        for (const [moodKeyword, genres] of Object.entries(MOOD_TO_GENRE)) {
            if (prompt.includes(moodKeyword)) {
                genres.forEach(g => matchedGenres.add(g));
            }
        }
    }

    // 3. Bulunan türleri veritabanı anahtar kelimelerine çevir
    const dbKeywords: string[] = [];
    for (const genre of matchedGenres) {
        const mappings = GENRE_MAPPINGS[genre];
        if (mappings) {
            dbKeywords.push(...mappings);
        }
    }

    return dbKeywords;
};

/**
 * Hangi türün eşleştiğini döndür (mesaj için)
 */
const getMatchedGenreName = (userPrompt: string): string => {
    const prompt = userPrompt.toLowerCase();

    // Doğrudan tür ismi
    for (const turkishGenre of Object.keys(GENRE_MAPPINGS)) {
        if (prompt.includes(turkishGenre)) {
            return turkishGenre;
        }
    }

    // Doğal dil ifadesi
    for (const [moodKeyword, genres] of Object.entries(MOOD_TO_GENRE)) {
        if (prompt.includes(moodKeyword)) {
            return genres[0]; // İlk eşleşen türü döndür
        }
    }

    return userPrompt;
};

class AiService {
    private groq: Groq | null = null;
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        if (!GROQ_API_KEY) {
            console.warn('⚠️ Groq API Key tanımlanmamış. AI özellikleri devre dışı.');
            return;
        }
        this.groq = new Groq({ apiKey: GROQ_API_KEY });
        this.isInitialized = true;
        console.log('✅ Groq AI initialized');
    }

    /**
     * Kullanıcı isteğine göre film/dizi önerileri getirir.
     * YENİ YAKLAŞIM: Veritabanındaki genre alanına göre arama yapar.
     */
    async getRecommendations(userPrompt: string): Promise<{
        message: string;
        movies: any[];
    }> {
        if (!database) {
            return {
                message: 'Veritabanı yüklenemedi.',
                movies: []
            };
        }

        try {
            // 1. Kullanıcının isteğinden tür belirle
            const genreKeywords = extractGenreKeywords(userPrompt);
            console.log('🔍 Aranan türler:', genreKeywords);

            let allMovies: any[] = [];
            let allSeries: any[] = [];

            if (genreKeywords.length > 0) {
                // 2. Veritabanından türe göre ara - HEM FİLM HEM DİZİ
                const moviePromises = genreKeywords.map(genre =>
                    database!.get<Movie>('movies').query(
                        Q.where('genre', Q.like(`%${genre}%`)),
                        Q.take(10)
                    ).fetch()
                );

                const seriesPromises = genreKeywords.map(genre =>
                    database!.get<Series>('series').query(
                        Q.where('genre', Q.like(`%${genre}%`)),
                        Q.take(10)
                    ).fetch()
                );

                const movieResults = await Promise.all(moviePromises);
                const seriesResults = await Promise.all(seriesPromises);

                allMovies = movieResults.flat();
                allSeries = seriesResults.flat();

                console.log(`📽️ ${allMovies.length} film bulundu`);
                console.log(`📺 ${allSeries.length} dizi bulundu`);
            } else {
                // Tür belirlenemezse AI ile anahtar kelime al
                if (this.isInitialized && this.groq) {
                    return await this.getRecommendationsWithAI(userPrompt);
                }
            }

            // 3. Sonuçları formatla
            const moviesWithType = allMovies.map(m => ({
                id: m.streamId,
                title: m.name,
                poster: m.streamIcon,
                rating: m.rating,
                genre: m.genre,
                itemType: 'movie',
                model: m
            }));

            const seriesWithType = allSeries.map(s => ({
                id: s.seriesId,
                title: s.name,
                poster: s.cover,
                rating: s.rating,
                genre: s.genre,
                itemType: 'series',
                model: s
            }));

            // Tekrar edenleri temizle
            const uniqueMovies = Array.from(
                new Map(moviesWithType.map(item => [item.id, item])).values()
            );
            const uniqueSeries = Array.from(
                new Map(seriesWithType.map(item => [item.id, item])).values()
            );

            // Film ve dizileri dengeli şekilde karıştır (15 film + 15 dizi)
            const finalMovies = uniqueMovies.slice(0, 15);
            const finalSeries = uniqueSeries.slice(0, 15);
            const allResults = [...finalMovies, ...finalSeries];

            // Sonuç yoksa bilgi ver
            if (allResults.length === 0) {
                return {
                    message: `"${userPrompt}" türünde içerik bulunamadı. Farklı bir tür deneyebilirsiniz.`,
                    movies: []
                };
            }

            // Türkçe mesaj oluştur
            const genreName = getMatchedGenreName(userPrompt);

            return {
                message: `🎬 İşte ${genreName} kategorisindeki önerilerim! ${finalMovies.length} film ve ${finalSeries.length} dizi buldum.`,
                movies: allResults
            };

        } catch (error) {
            console.error('AI Service Error:', error);
            return {
                message: 'Arama sırasında bir hata oluştu.',
                movies: []
            };
        }
    }

    /**
     * AI ile anahtar kelime tabanlı arama (fallback)
     */
    private async getRecommendationsWithAI(userPrompt: string): Promise<{
        message: string;
        movies: any[];
    }> {
        if (!this.groq) {
            return { message: 'AI kullanılamıyor.', movies: [] };
        }

        try {
            const systemPrompt = `Film ve dizi öneri asistanısın. Kullanıcının isteğine uygun 20 film/dizi ismi öner.
Yanıtı JSON olarak ver: {"message": "mesaj", "searchKeywords": ["film1", "dizi1"]}`;

            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.3,
                max_tokens: 1024,
                response_format: { type: 'json_object' }
            });

            const responseText = completion.choices[0]?.message?.content || '{}';
            const parsedResponse = JSON.parse(responseText);

            // AI'dan gelen anahtar kelimelerle veritabanında ara
            let allResults: any[] = [];

            if (parsedResponse.searchKeywords && Array.isArray(parsedResponse.searchKeywords)) {
                for (const keyword of parsedResponse.searchKeywords.slice(0, 15)) {
                    if (!database || !keyword) continue;

                    const [movies, series] = await Promise.all([
                        database.get<Movie>('movies').query(
                            Q.where('name', Q.like(`%${keyword}%`)),
                            Q.take(2)
                        ).fetch(),
                        database.get<Series>('series').query(
                            Q.where('name', Q.like(`%${keyword}%`)),
                            Q.take(2)
                        ).fetch()
                    ]);

                    allResults.push(
                        ...movies.map(m => ({
                            id: m.streamId,
                            title: m.name,
                            poster: m.streamIcon,
                            rating: m.rating,
                            itemType: 'movie',
                            model: m
                        })),
                        ...series.map(s => ({
                            id: s.seriesId,
                            title: s.name,
                            poster: s.cover,
                            rating: s.rating,
                            itemType: 'series',
                            model: s
                        }))
                    );
                }
            }

            const uniqueResults = Array.from(
                new Map(allResults.map(item => [`${item.itemType}-${item.id}`, item])).values()
            );

            return {
                message: parsedResponse.message || 'İşte önerilerim!',
                movies: uniqueResults.slice(0, 30)
            };

        } catch (error) {
            console.error('AI fallback error:', error);
            return { message: 'Arama başarısız.', movies: [] };
        }
    }
}

export const aiService = new AiService();
export default aiService;
