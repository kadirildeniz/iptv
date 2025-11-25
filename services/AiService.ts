import { GoogleGenerativeAI } from '@google/generative-ai';
import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import Movie from './database/models/Movie';
import Series from './database/models/Series';

// TODO: Replace with user's Gemini API Key or load from env
const GEMINI_API_KEY = 'AIzaSyDNwaC1_gQCussc8XmbtpYp1jcriMvl54A';

class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    /**
     * Kullanıcı isteğine göre film önerileri getirir.
     * 1. Gemini'den arama anahtar kelimeleri ister.
     * 2. Yerel veritabanında bu kelimelerle arama yapar.
     */
    async getRecommendations(userPrompt: string): Promise<{
        message: string;
        movies: any[];
    }> {
        try {
            // 1. Gemini'den anahtar kelime ve samimi bir cevap iste
            const systemPrompt = `
        Sen bir Film ve Dizi asistanısın. Kullanıcı sana ne izlemek istediğini söyleyecek.
        Senin görevin:
        1. Kullanıcıya kısa, samimi ve eğlenceli bir cevap ver (Türkçe).
        2. Kullanıcının isteğine uygun, yerel veritabanında aranabilecek 25-30 adet FİLM veya DİZİ anahtar kelimesi üret.
        
        ÖNEMLİ KURALLAR:
        - Asla "Komedi", "Aksiyon", "Savaş" gibi genel tür isimlerini anahtar kelime olarak verme.
        - Hem popüler filmleri (Matrix, Inception) hem de dizileri (Breaking Bad, Gibi, Kurtlar Vadisi) düşün.
        - Sadece spesifik eser isimleri öner.
        - Film/Dizi isimlerini tam ve doğru yazmaya çalış.
        
        Cevabını şu JSON formatında ver (Sadece JSON ver, markdown yok):
        {
          "message": "Kullanıcıya gösterilecek mesaj...",
          "searchKeywords": ["recep ivedik", "breaking bad", "gora", "kurtlar vadisi", "arog", "game of thrones", "vizontele", "gibi", "ölümlü dünya", "aile arasında"]
        }
      `;

            const result = await this.model.generateContent(`${systemPrompt}\n\nKullanıcı İsteği: "${userPrompt}"`);
            const responseText = result.response.text();

            // JSON temizleme (Markdown ```json ... ``` bloklarını kaldır)
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            let parsedResponse;
            try {
                parsedResponse = JSON.parse(cleanJson);
            } catch (e) {
                console.error('JSON parse hatası:', e);
                return {
                    message: 'Üzgünüm, şu an seni tam anlayamadım ama rastgele bir şeyler önerebilirim.',
                    movies: []
                };
            }

            console.log('🤖 AI Cevabı:', parsedResponse);

            // 2. Anahtar kelimelerle veritabanında arama yap (Hybrid: Movie + Series)
            let allResults: any[] = [];

            if (parsedResponse.searchKeywords && Array.isArray(parsedResponse.searchKeywords)) {
                const promises = parsedResponse.searchKeywords.map(async (keyword: string) => {
                    // Türkçe karakter temizliği veya normalizasyon gerekebilir ama şimdilik direkt arayalım
                    // WatermelonDB LIKE sorgusu case-insensitive çalışır (genellikle)

                    if (!database) return [];

                    const [foundMovies, foundSeries] = await Promise.all([
                        database.get<Movie>('movies').query(
                            Q.where('name', Q.like(`%${keyword}%`)),
                            Q.take(5)
                        ).fetch(),
                        database.get<Series>('series').query(
                            Q.where('name', Q.like(`%${keyword}%`)),
                            Q.take(5)
                        ).fetch()
                    ]);

                    const moviesWithType = foundMovies.map(m => ({
                        id: m.streamId,
                        title: m.name,
                        poster: m.streamIcon,
                        rating: m.rating,
                        itemType: 'movie',
                        model: m
                    }));

                    const seriesWithType = foundSeries.map(s => ({
                        id: s.seriesId,
                        title: s.name,
                        poster: s.cover,
                        rating: s.rating,
                        itemType: 'series',
                        model: s
                    }));

                    return [...moviesWithType, ...seriesWithType];
                });

                const results = await Promise.all(promises);
                allResults = results.flat();
            }

            // Tekrar edenleri temizle (ID ve Type'a göre unique key oluştur)
            const uniqueResults = Array.from(new Map(allResults.map(item => [`${item.itemType}-${item.id}`, item])).values());

            return {
                message: parsedResponse.message,
                movies: uniqueResults.slice(0, 15) // En fazla 15 sonuç göster
            };

        } catch (error) {
            console.error('AI Service Error:', error);
            return {
                message: 'Bağlantıda bir sorun oluştu, lütfen tekrar dene.',
                movies: []
            };
        }
    }
}

export const aiService = new AiService();
export default aiService;
