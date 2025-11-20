import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Stack, useRouter, Redirect, useFocusEffect } from 'expo-router';
import { fonts } from '@/theme/fonts';
import CategoryList from '@/app/components/CategoryList';
import SeriesCard from '@/app/components/SeriesCard';
import SearchHeader from '@/app/components/SearchHeader';
import { databaseService, storageService, database, type Series as ApiSeries } from '@/services';
import SeriesModel from '@/services/database/models/Series';
import SeriesCategoryModel from '@/services/database/models/SeriesCategory';
import apiClient from '@/services/api/client';
import { turkishIncludes } from '@/utils/textUtils';

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
  }, [selectedCategory]); // favorites dependency removed to prevent full refresh

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

      await apiClient.loadCredentials();

      await loadFavorites();
      await loadCategories();
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
      const favIds = storedFavorites.filter((f) => f.type === 'series').map((f) => f.id);
      setFavorites(new Set(favIds));
      console.log(`✅ Favori diziler yüklendi: ${favIds.length} adet`);
    } catch (err) {
      console.error('Favorites load error:', err);
    }
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!database) {
        console.error('❌ Veritabanı başlatılamadı');
        setError('Veritabanı başlatılamadı. Lütfen uygulamayı yeniden başlatın.');
        setLoading(false);
        return;
      }

      const dbCategories = await database.get<SeriesCategoryModel>('series_categories').query().fetch();
      let formattedCategories: UICategory[] = [];

      if (dbCategories.length > 0) {
        const uniqueMap = new Map<string, UICategory>();
        dbCategories.forEach((record) => {
          if (!uniqueMap.has(record.categoryId)) {
            uniqueMap.set(record.categoryId, {
              id: record.categoryId,
              name: record.categoryName,
            });
          }
        });
        formattedCategories = Array.from(uniqueMap.values());
        console.log(`✅ ${formattedCategories.length} dizi kategorisi DB'den yüklendi`);
      } else {
        console.log('⚠️ Dizi kategorileri bulunamadı. Lütfen ana sayfadan "Güncelle" butonuna basın.');
        setError('Kategoriler bulunamadı. Lütfen ana sayfadan "Tüm Verileri Güncelle" butonuna basarak verileri indirin.');
        setLoading(false);
        return;
      }

      const filteredCategories = formattedCategories.filter(
        (cat) => cat.id !== 'all' && cat.id !== 'favorites'
      );

      const withSpecial: UICategory[] = [
        { id: 'all', name: '📺 TÜM' },
        { id: 'continue_watching', name: '⏯️ İZLEMEYE DEVAM ET' },
        { id: 'favorites', name: '⭐ FAVORİLERİM' },
        ...filteredCategories,
      ];

      setCategories(withSpecial);
      setSelectedCategory('all');
    } catch (err) {
      console.error('❌ Dizi kategorileri yükleme hatası:', err);
      setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const loadSeries = async (categoryId: string) => {
    try {
      setLoadingSeries(true);

      if (!database) {
        console.error('❌ Veritabanı başlatılamadı');
        setSeries([]);
        setLoadingSeries(false);
        return;
      }

      const dbSeries = await database.get<SeriesModel>('series').query().fetch();

      if (dbSeries.length === 0) {
        console.log('⚠️ Diziler bulunamadı. Lütfen ana sayfadan "Güncelle" butonuna basın.');
        setSeries([]);
        setLoadingSeries(false);
        return;
      }

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

      let apiSeries: ApiSeries[] = [];
      if (categoryId === 'all') {
        apiSeries = dbSeriesFormatted;
      } else if (categoryId === 'continue_watching') {
        const continueWatchingList = await databaseService.getContinueWatching();
        // Dizi ID'lerini çıkar (format: seriesId_sSeasonNum_eEpisodeNum)
        const continueSeriesIds = new Set(
          continueWatchingList
            .filter((c) => c.type === 'series')
            .map((c) => c.id.split('_')[0]) // İlk kısmı al (series ID)
        );
        apiSeries = dbSeriesFormatted.filter((s) => continueSeriesIds.has(s.series_id.toString()));
      } else if (categoryId === 'favorites') {
        const favList = await databaseService.getFavorites();
        const favIds = new Set(favList.filter((f) => f.type === 'series').map((f) => f.id));
        apiSeries = dbSeriesFormatted.filter((s) => favIds.has(s.series_id.toString()));
      } else {
        apiSeries = dbSeriesFormatted.filter(
          (s) =>
            s.category_id === categoryId ||
            (s.category_ids && s.category_ids.includes(parseInt(categoryId)))
        );
      }

      setSeries(apiSeries);
      console.log(`✅ ${apiSeries.length} dizi veritabanından yüklendi`);

      // Sezon sayılarını işle
      const seasonsMap = new Map<string, number>();
      dbSeries.forEach((s) => {
        const seriesId = s.seriesId.toString();
        if (s.seasons) {
          try {
            const seasons = JSON.parse(s.seasons);
            if (Array.isArray(seasons) && seasons.length > 0) {
              seasonsMap.set(seriesId, seasons.length);
            }
          } catch (e) {
            console.warn(`⚠️ Sezon parse hatası: ${seriesId}`);
          }
        }
      });
      if (seasonsMap.size > 0) {
        setSeasonsCount(seasonsMap);
      }
    } catch (err) {
      console.error('Series load error:', err);
      setSeries([]);
    } finally {
      setLoadingSeries(false);
    }
  };

  const handleToggleFavorite = useCallback(
    async (seriesId: string) => {
      try {
        const seriesItem = series.find((s) => s.series_id.toString() === seriesId);
        if (!seriesItem) return;

        const next = await databaseService.toggleFavorite({
          id: seriesId,
          type: 'series',
          title: seriesItem.name,
          cover: seriesItem.cover || '',
        });

        setFavorites((prev) => {
          const newSet = new Set(prev);
          if (next) {
            newSet.add(seriesId);
          } else {
            newSet.delete(seriesId);
          }
          return newSet;
        });
        
        // Sadece favorilerim sayfasındaysak listeyi yenile
        if (selectedCategory === 'favorites') {
            loadSeries('favorites');
        }
        
        console.log(`✅ Favori ${next ? 'eklendi' : 'çıkarıldı'}: ${seriesItem.name}`);
      } catch (err) {
        console.error('Favori güncelleme hatası:', err);
      }
    },
    [series, selectedCategory]
  );

  const filteredSeries = useMemo(() => {
    let filtered = series;
    if (searchQuery.trim() && searchQuery.trim().length >= 3) {
      // Türkçe karakter desteği ile arama
      filtered = filtered.filter((s) => turkishIncludes(s.name, searchQuery));
    }
    return filtered;
  }, [series, searchQuery]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSeriesPress = useCallback(
    (seriesId: string) => {
      router.push(`/series/${seriesId}`);
    },
    [router]
  );

  const numColumns = useMemo(() => {
    if (Platform.OS === 'web') {
      return width > 1200 ? 5 : width > 768 ? 4 : 3;
    }
    return width > 768 ? 3 : 2;
  }, [width]);

  const renderSeries = useCallback(
    ({ item }: { item: ApiSeries }) => {
      const seriesId = item.series_id.toString();
      let seasons = seasonsCount.get(seriesId);
      if (seasons === undefined) {
        const seasonsArray = (item as any).seasons;
        if (Array.isArray(seasonsArray) && seasonsArray.length > 0) {
          seasons = seasonsArray.length;
        }
      }
      const isFavorite = favorites.has(seriesId);

      return (
        <View style={[styles.seriesCardWrapper, { width: `${100 / numColumns}%` }]}>
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
    },
    [numColumns, handleSeriesPress, handleToggleFavorite, seasonsCount, favorites]
  );

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
          <TouchableOpacity
            style={styles.backToHomeButton}
            onPress={() => router.push('/')}
            activeOpacity={0.8}
          >
            <Text style={styles.backToHomeText}>Ana Sayfaya Dön</Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
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
          <SearchHeader
            title="Diziler"
            onSearch={handleSearch}
            placeholder="Dizilerde ara..."
            itemCount={filteredSeries.length}
            itemLabel="içerik"
          />

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
                  : '📺 Bu kategoride dizi bulunamadı. Lütfen ana sayfadan güncelleme yapın.'}
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
                  ? [
                      styles.seriesRow,
                      Platform.OS === 'web' ? styles.seriesRowWide : styles.seriesRowCompact,
                    ]
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
    marginBottom: 20,
    textAlign: 'center',
  },
  backToHomeButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backToHomeText: {
    color: '#fff',
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
