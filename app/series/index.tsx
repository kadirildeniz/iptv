import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { fonts } from '@/theme/fonts';
import CategoryList from '@/app/components/CategoryList';
import SeriesCard from '@/app/components/SeriesCard';
import { seriesService, databaseService, storageService, syncService, database, type SeriesCategory, type Series as ApiSeries } from '@/services';
import SeriesModel from '@/services/database/models/Series';
import apiClient from '@/services/api/client';

interface UICategory {
  id: string;
  name: string;
}

const Series: React.FC = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [categories, setCategories] = useState<UICategory[]>([]);
  const [series, setSeries] = useState<ApiSeries[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [seasonsCount, setSeasonsCount] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  useEffect(() => {
    if (selectedCategory) {
      loadSeries(selectedCategory);
    }
  }, [selectedCategory]); // favorites dependency'sini kaldırdık - sadece kategori değiştiğinde yükle

  const initialize = async () => {
    try {
      setLoading(true);
      setError(null);

      const credentials = await storageService.getCredentials();
      if (!credentials) {
        setShouldRedirect(true);
        setLoading(false);
        return;
      }

      // API client'a credentials'ı yükle
      await apiClient.loadCredentials();

      await loadFavorites();
      await loadCategories();
      // Sync loadSeries içinde tetikleniyor, burada tekrar çağırmaya gerek yok
    } catch (err) {
      console.error('Series init error:', err);
      setError('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = useCallback(async () => {
    try {
      const storedFavorites = await databaseService.getFavorites();
      const favIds = storedFavorites
        .filter((f) => f.type === 'series')
        .map((f) => f.id);
      setFavorites(new Set(favIds));
      console.log(`✅ Favori diziler yüklendi: ${favIds.length} adet`);
    } catch (err) {
      console.error('Favorites load error:', err);
    }
  }, []);

  const loadCategories = async () => {
    try {
      // Önce AsyncStorage'dan kategorileri kontrol et
      const cachedCategories = await storageService.getItem<UICategory[]>('SERIES_CATEGORIES');
      
      if (cachedCategories && cachedCategories.length > 0) {
        const withSpecial: UICategory[] = [
          { id: 'all', name: '📺 TÜM' },
          { id: 'favorites', name: '⭐ FAVORİLERİM' },
          ...cachedCategories,
        ];
        setCategories(withSpecial);
        setSelectedCategory('all');
        return;
      }

      // Eğer cache'de yoksa, API'den çek (sadece ilk kez)
      const apiCategories = await seriesService.getCategories();
      
      const formatted: UICategory[] = apiCategories.map((c: SeriesCategory) => ({
        id: c.category_id,
        name: c.category_name,
      }));

      // AsyncStorage'a kaydet
      await storageService.setItem('SERIES_CATEGORIES', formatted);

      const withSpecial: UICategory[] = [
        { id: 'all', name: '📺 TÜM' },
        { id: 'favorites', name: '⭐ FAVORİLERİM' },
        ...formatted,
      ];

      setCategories(withSpecial);
      setSelectedCategory('all');
    } catch (err) {
      console.error('Series categories load error:', err);
      setError('Kategoriler yüklenemedi');
    }
  };

  const loadSeries = async (categoryId: string) => {
    try {
      setLoadingSeries(true);
      let apiSeries: ApiSeries[] = [];

      // SWR Stratejisi: Önce database'den çek (stale data)
      if (database) {
        try {
          const dbSeries = await database
            .get<SeriesModel>('series')
            .query()
            .fetch();

          // Database'den gelen veriyi API formatına çevir
          const dbSeriesFormatted: ApiSeries[] = dbSeries.map((s, index) => ({
            num: index + 1,
            series_id: s.seriesId,
            name: s.name,
            cover: s.cover || '',
            plot: s.plot || '',
            cast: s.cast || '',
            director: s.director || '',
            genre: s.genre || '',
            releaseDate: s.releaseDate || '',
            last_modified: s.lastModified ? s.lastModified.toISOString() : '',
            rating: s.rating || '',
            rating_5based: s.rating5based || 0,
            backdrop_path: s.backdropPath ? JSON.parse(s.backdropPath) : [],
            youtube_trailer: s.youtubeTrailer || '',
            episode_run_time: s.episodeRunTime || '',
            category_id: s.categoryId,
            category_ids: s.categoryIds ? JSON.parse(s.categoryIds) : [],
          }));

          // Kategoriye göre filtrele
          if (categoryId === 'all') {
            apiSeries = dbSeriesFormatted;
          } else if (categoryId === 'favorites') {
            apiSeries = dbSeriesFormatted.filter((s) =>
              favorites.has(s.series_id.toString())
            );
          } else {
            apiSeries = dbSeriesFormatted.filter((s) =>
              s.category_id === categoryId || 
              (s.category_ids && s.category_ids.includes(parseInt(categoryId)))
            );
          }

          // Veriyi hemen göster (sadece database'den)
          setSeries(apiSeries);
          
          // Sezon sayılarını işle (database'den gelen veri için)
          const seasonsMap = new Map<string, number>();
          apiSeries.forEach((s) => {
            const seriesId = s.series_id.toString();
            const seasons = (s as any).seasons;
            if (Array.isArray(seasons) && seasons.length > 0) {
              seasonsMap.set(seriesId, seasons.length);
            }
          });
          if (seasonsMap.size > 0) {
            setSeasonsCount((prev) => {
              const newMap = new Map(prev);
              seasonsMap.forEach((count, id) => {
                newMap.set(id, count);
              });
              return newMap;
            });
          }
        } catch (dbError) {
          console.warn('Database read error:', dbError);
          setSeries([]);
        }
      } else {
        // Database yoksa boş liste göster
        setSeries([]);
      }

      // Arka planda sync tetikle (UI'ı bloke etmeden) - sadece "all" kategorisinde
      // SyncService zaten zaman damgası kontrolü yapıyor, gereksiz istek atmıyor
      if (categoryId === 'all') {
        syncService.checkAndRunSync('series').catch(err => {
          console.error('Background sync error:', err);
        });
      }
    } catch (err) {
      console.error('Series load error:', err);
      setSeries([]);
    } finally {
      setLoadingSeries(false); // Her durumda loading'i kapat
    }
  };

  const handleToggleFavorite = useCallback(async (seriesId: string) => {
    try {
      const seriesItem = series.find((s) => s.series_id.toString() === seriesId);
      if (!seriesItem) return;

      const next = await databaseService.toggleFavorite({
        id: seriesId,
        type: 'series',
        title: seriesItem.name,
        cover: seriesItem.cover || '',
      });

      // Favori listesini güncelle
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (next) {
          newSet.add(seriesId);
        } else {
          newSet.delete(seriesId);
        }
        return newSet;
      });

      // Eğer "favorites" kategorisindeyse, listeyi yeniden yükle
      if (selectedCategory === 'favorites') {
        loadSeries('favorites');
      }

      console.log(`✅ Favori ${next ? 'eklendi' : 'çıkarıldı'}: ${seriesItem.name}`);
    } catch (err) {
      console.error('Favori güncelleme hatası:', err);
    }
  }, [series]);

  const filteredSeries = useMemo(() => {
    let filtered = series;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [series, searchQuery]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSeriesPress = useCallback((seriesId: string) => {
    router.push(`/series/${seriesId}`);
  }, [router]);

  // Responsive grid hesaplamaları
  const numColumns = useMemo(() => {
    if (Platform.OS === 'web') {
      return width > 1200 ? 5 : width > 768 ? 4 : 3;
    }
    return width > 768 ? 3 : 2;
  }, [width]);

  const renderSeries = useCallback(({ item }: { item: ApiSeries }) => {
    const seriesId = item.series_id.toString();
    // Önce state'ten kontrol et, yoksa API'den gelen datadan al
    let seasons = seasonsCount.get(seriesId);
    if (seasons === undefined) {
      // API'den gelen datada seasons array'i varsa onu kullan
      const seasonsArray = (item as any).seasons;
      if (Array.isArray(seasonsArray) && seasonsArray.length > 0) {
        seasons = seasonsArray.length;
      }
    }
    const isFavorite = favorites.has(seriesId);
    
    return (
      <View 
        style={[
          styles.seriesCardWrapper,
          { width: `${100 / numColumns}%` }
        ]}
      >
        <SeriesCard
          id={seriesId}
          title={item.name}
          year={item.releaseDate || ''}
          image={item.cover || 'https://via.placeholder.com/300x200/2c3e50/ffffff?text=Series'}
          category={item.category_id}
          seasons={seasons}
          isFavorite={isFavorite}
          onPress={handleSeriesPress}
          onFavoritePress={handleToggleFavorite}
        />
      </View>
    );
  }, [numColumns, handleSeriesPress, handleToggleFavorite, seasonsCount, favorites, width]);

  const keyExtractor = useCallback((item: ApiSeries) => item.series_id.toString(), []);

  if (shouldRedirect) {
    return <Redirect href="/login" />;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View style={[styles.sidebar, { width: Math.min(Math.max(width * 0.26, 180), 320) }]}>
          <View style={styles.backRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={20} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={styles.backLabel}>Diziler</Text>
          </View>
          <Text style={styles.sidebarSubtitle}>KATEGORİLER</Text>
          <CategoryList
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            layoutMode="sidebar"
            title=""
            subtitle=""
          />
        </View>

        <View style={styles.catalogWrapper}>
          <View style={styles.topBarWrapper}>
            <View>
              <Text style={styles.topBarHeading}>Diziler</Text>
              <Text style={styles.topBarSubheading}>{filteredSeries.length} içerik</Text>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#dbeafe" />
              <TextInput
                style={styles.searchInput}
                placeholder="Dizilerde ara..."
                placeholderTextColor="rgba(219, 234, 254, 0.6)"
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {loadingSeries ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text style={styles.loadingText}>Diziler yükleniyor...</Text>
            </View>
          ) : filteredSeries.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {selectedCategory === 'favorites'
                  ? '⭐ Henüz favori dizi eklemediniz'
                  : searchQuery
                  ? `"${searchQuery}" için sonuç bulunamadı`
                  : '📺 Bu kategoride dizi bulunamadı'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredSeries}
              renderItem={renderSeries}
              keyExtractor={keyExtractor}
              numColumns={numColumns}
              columnWrapperStyle={
                numColumns > 1
                  ? [styles.seriesRow, Platform.OS === 'web' ? styles.seriesRowWide : styles.seriesRowCompact]
                  : undefined
              }
              contentContainerStyle={styles.seriesGrid}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={12}
              windowSize={10}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0033ab',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 24,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    gap: 16,
  },
  sidebar: {
    backgroundColor: '#0b1120',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.7)',
    shadowColor: '#020617',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    flexShrink: 0,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: {
    color: '#e2e8f0',
    fontSize: 15,
    letterSpacing: 0.4,
    fontFamily: fonts.semibold,
  },
  sidebarSubtitle: {
    color: '#e61919',
    fontSize: 14,
    letterSpacing: 0.6,
    marginBottom: 12,
    textTransform: 'uppercase',
    fontFamily: fonts.bold,
  
  },
  catalogWrapper: {
    flex: 1,
    backgroundColor: '#0033ab',
  },
  topBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  topBarHeading: {
    color: '#f8fafc',
    fontSize: 20,
    letterSpacing: 0.6,
    marginBottom: 2,
    fontFamily: fonts.bold,
  },
  topBarSubheading: {
    color: 'rgba(226, 232, 240, 0.75)',
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1d4ed8',
    gap: 8,
    flex: 1,
    maxWidth: 360,
    shadowColor: '#1d4ed8',
    shadowOpacity: Platform.OS === 'web' ? 0.25 : 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  searchInput: {
    flex: 1,
    color: '#dbeafe',
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  seriesGrid: {
    paddingBottom: 48,
    paddingHorizontal: 4,
  },
  seriesRow: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  seriesRowWide: {
    marginBottom: 18,
    columnGap: 14,
  },
  seriesRowCompact: {
    marginBottom: 16,
    columnGap: 10,
  },
  seriesCardWrapper: {
    flex: 1,
    paddingHorizontal: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    fontFamily: fonts.regular,
  },
});

export default Series;
