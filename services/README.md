# Services Klasörü - Xtream Codes IPTV API

Bu klasör IPTV uygulamasının tüm servis katmanını içerir. **Xtream Codes API** standardına göre yapılandırılmıştır.

## 🏗️ Klasör Yapısı

```
services/
├── api/
│   ├── client.ts       # Axios instance, dinamik credentials yönetimi
│   ├── endpoints.ts    # Xtream Codes API endpoint tanımları
│   └── types.ts        # Xtream Codes API type tanımları
├── auth.service.ts     # Kimlik doğrulama servisi
├── channel.service.ts  # Canlı TV kanalları servisi
├── movie.service.ts    # Film (VOD) servisi
├── series.service.ts   # Dizi servisi
├── storage.service.ts  # Local storage servisi
├── index.ts           # Export dosyası
├── example-usage.ts   # Kullanım örnekleri
└── README.md          # Bu dosya
```

## 🚀 Hızlı Başlangıç

### 1. Kullanıcı Girişi

```typescript
import { authService } from '@/services';

// Host, username ve password ile giriş
const accountInfo = await authService.login({
  host: 'zunexle.live',
  port: '8080',
  username: 'tGz3GyyBN3Dc',
  password: '11auBENYMpS1',
  protocol: 'http', // veya 'https'
});

console.log('Hesap durumu:', accountInfo.user_info.status);
console.log('Bitiş tarihi:', accountInfo.user_info.exp_date);
```

### 2. Canlı TV Kanalları

```typescript
import { channelService } from '@/services';

// Kategorileri getir
const categories = await channelService.getCategories();

// Tüm kanalları getir
const channels = await channelService.getChannels();

// Belirli kategorideki kanalları getir
const sportChannels = await channelService.getChannelsByCategory('1');

// Kanal detayı
const channel = await channelService.getChannelById('12345');
console.log('Stream URL:', channel?.streamUrl);

// EPG (Program rehberi)
const epg = await channelService.getEPG('12345', 10);
```

### 3. Filmler (VOD)

```typescript
import { movieService } from '@/services';

// Kategorileri getir
const categories = await movieService.getCategories();

// Filmleri getir
const movies = await movieService.getMovies();

// Popüler filmler
const popular = await movieService.getPopularMovies(undefined, 20);

// Film detayları
const movieInfo = await movieService.getMovieInfo('12345');
console.log('Film adı:', movieInfo.info.name);
console.log('IMDB Rating:', movieInfo.info.rating_count_kinopoisk);
```

### 4. Diziler

```typescript
import { seriesService } from '@/services';

// Kategorileri getir
const categories = await seriesService.getCategories();

// Dizileri getir
const series = await seriesService.getSeries();

// Dizi detayları (sezonlar ve bölümler)
const seriesInfo = await seriesService.getSeriesInfo('12345');
console.log('Sezonlar:', seriesInfo.seasons);
console.log('Bölümler:', seriesInfo.episodes);

// Belirli sezonun bölümleri
const episodes = await seriesService.getEpisodesBySeason('12345', 1);
console.log('1. sezon stream URL:', episodes[0].streamUrl);
```

### 5. Local Storage (Favoriler, Geçmiş)

```typescript
import { storageService } from '@/services';

// Favorilere ekle
await storageService.addToFavorites({
  id: 'movie-123',
  type: 'movie',
});

// İzleme geçmişi
await storageService.addToHistory({
  id: 'movie-123',
  type: 'movie',
  title: 'Film Adı',
});

// İzlemeye devam et (progress)
await storageService.saveContinueWatching({
  id: 'movie-123',
  type: 'movie',
  title: 'Film Adı',
  progress: 45,
  duration: 7200,
  currentTime: 3240,
});
```

## 📡 API Yapısı

### Xtream Codes API Endpoints

```
http://HOST:PORT/player_api.php?username=XXX&password=XXX&action=ACTION
```

**Desteklenen Action'lar:**

- `get_account_info` - Hesap bilgileri
- `get_live_categories` - Canlı TV kategorileri
- `get_live_streams` - Canlı TV kanalları
- `get_vod_categories` - Film kategorileri
- `get_vod_streams` - Filmler
- `get_vod_info` - Film detayları
- `get_series_categories` - Dizi kategorileri
- `get_series` - Diziler
- `get_series_info` - Dizi detayları (sezonlar/bölümler)
- `get_short_epg` - EPG (Program rehberi)

### Stream URL'leri

**Canlı TV:**
```
http://HOST:PORT/live/USERNAME/PASSWORD/STREAM_ID.ts
```

**Film (VOD):**
```
http://HOST:PORT/movie/USERNAME/PASSWORD/MOVIE_ID.mp4
```

**Dizi Bölümü:**
```
http://HOST:PORT/series/USERNAME/PASSWORD/EPISODE_ID.mp4
```

## 🔧 Dinamik Host Yönetimi

Bu servisler **dinamik host** yapısını destekler. Kullanıcı giriş yaparken host bilgisini verir ve bu bilgiler güvenli şekilde AsyncStorage'da saklanır.

```typescript
// Giriş yap - Credentials saklanır
await authService.login({
  host: 'zunexle.live',
  port: '8080',
  username: 'XXX',
  password: 'XXX',
});

// Sonraki tüm API çağrıları otomatik olarak bu credentials'ı kullanır
const channels = await channelService.getChannels(); // ✅ Otomatik auth

// Uygulama yeniden başladığında credentials'ı yükle
await authService.loadCredentials();
```

## 🔐 Güvenlik

- Credentials AsyncStorage'da şifreli olarak saklanır
- Her API çağrısında otomatik olarak username/password eklenir
- Hatalı giriş denemelerinde credentials temizlenir
- 401/403 hatalarında otomatik olarak hata yönetimi yapılır

## 📱 React Component Örnekleri

Detaylı kullanım örnekleri için `services/example-usage.ts` dosyasına bakın.

### Login Ekranı Örneği

```typescript
const handleLogin = async () => {
  try {
    const accountInfo = await authService.login({
      host: 'zunexle.live',
      port: '8080',
      username: 'XXX',
      password: 'XXX',
      protocol: 'http',
    });
    
    // Başarılı giriş
    console.log('Hesap durumu:', accountInfo.user_info.status);
  } catch (error) {
    console.error('Giriş hatası:', error);
  }
};
```

### Kanal Listesi Örneği

```typescript
const [channels, setChannels] = useState<Channel[]>([]);

useEffect(() => {
  const loadChannels = async () => {
    const result = await channelService.getChannels();
    setChannels(result);
  };
  
  loadChannels();
}, []);
```

## 🎯 TypeScript Desteği

Tüm servisler tam TypeScript desteği ile gelir:

```typescript
import type { 
  Channel, 
  Movie, 
  Series, 
  AccountInfo,
  LiveCategory,
  VodCategory 
} from '@/services';
```

## 📚 Daha Fazla Bilgi

- Xtream Codes API Dokümantasyonu: [GitHub](https://github.com/IPTV-Apps/xtream-codes-api)
- Kullanım örnekleri: `services/example-usage.ts`
- Type tanımları: `services/api/types.ts`
