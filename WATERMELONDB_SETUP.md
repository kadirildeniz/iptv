# WatermelonDB Kurulum Rehberi

WatermelonDB başarıyla projeye entegre edildi! Aşağıdaki adımları tamamlayın:

## 1. Gerekli Paketleri Kurun

```bash
npm install expo-sqlite
```

## 2. Yapılan Konfigürasyonlar

### ✅ Babel Konfigürasyonu
- `babel.config.js` dosyasına WatermelonDB plugin'i eklendi

### ✅ Database Schema
- `services/database/schema.ts` - Veritabanı şeması tanımlandı
- 4 tablo oluşturuldu:
  - `favorites` - Favoriler
  - `watch_history` - İzleme geçmişi
  - `continue_watching` - İzlemeye devam et
  - `episode_progress` - Bölüm ilerlemesi

### ✅ Model Dosyaları
- `services/database/models/Favorite.ts`
- `services/database/models/WatchHistory.ts`
- `services/database/models/ContinueWatching.ts`
- `services/database/models/EpisodeProgress.ts`

### ✅ Database Instance
- `services/database/index.ts` - Database instance oluşturuldu

### ✅ Database Service
- `services/database.service.ts` - Tüm database işlemleri için servis oluşturuldu

## 3. Kullanım Örnekleri

### Favorilere Ekleme
```typescript
import { databaseService } from '@/services';

await databaseService.addToFavorites({
  id: '123',
  type: 'movie',
  title: 'Avatar',
  poster: 'https://example.com/poster.jpg',
});
```

### Favorileri Getirme
```typescript
const favorites = await databaseService.getFavorites();
```

### İzleme Geçmişine Ekleme
```typescript
await databaseService.addToHistory({
  id: '123',
  type: 'movie',
  title: 'Avatar',
  poster: 'https://example.com/poster.jpg',
  duration: 7200,
  progress: 50,
});
```

### İzlemeye Devam Et Kaydetme
```typescript
await databaseService.saveContinueWatching({
  id: '123',
  type: 'movie',
  title: 'Avatar',
  poster: 'https://example.com/poster.jpg',
  progress: 50,
  currentTime: 3600,
  duration: 7200,
});
```

### Bölüm İlerlemesi Kaydetme
```typescript
await databaseService.saveEpisodeProgress({
  seriesId: '456',
  seasonNumber: 1,
  episodeNumber: 5,
  episodeId: '456-s1-e5',
  title: 'Episode 5',
  progress: 75,
  currentTime: 2700,
  duration: 3600,
  watched: false,
});
```

## 4. Önemli Notlar

- **expo-sqlite** paketi mutlaka kurulmalı
- Database otomatik olarak oluşturulur ve yönetilir
- Tüm işlemler asenkron olarak yapılır
- Database işlemleri `database.write()` içinde yapılmalı

## 5. Sonraki Adımlar

1. `expo-sqlite` paketini kurun
2. Projeyi yeniden başlatın (`npm start` veya `expo start --clear`)
3. Database service'i kullanmaya başlayın!

## 6. Sorun Giderme

Eğer hata alırsanız:
- `expo-sqlite` kurulu mu kontrol edin
- Cache'i temizleyin: `npm run clean`
- Projeyi yeniden başlatın

