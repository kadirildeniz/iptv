import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, Redirect, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryList from '@/app/components/CategoryList';
import MovieCard from '@/app/components/MovieCard';
import SearchHeader from '@/app/components/SearchHeader';
import { databaseService, storageService, database, type Movie as ApiMovie } from '@/services';
import apiClient from '@/services/api/client';
import MovieModel from '@/services/database/models/Movie';
import MovieCategoryModel from '@/services/database/models/MovieCategory';
import { fonts } from '@/theme/fonts';
import { turkishIncludes } from '@/utils/textUtils';
import { getDeviceType } from '@/utils/responsive';

interface UICategory {
  id: string;
  name: string;
}

const Movies: React.FC = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [categories, setCategories] = useState<UICategory[]>([]);
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const deviceType = getDeviceType(width);

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
      loadMovies(selectedCategory);
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
      console.error('Movies init error:', err);
      setError('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = useCallback(async () => {
    try {
      const storedFavorites = await databaseService.getFavorites();
      const favIds = storedFavorites.filter((f) => f.type === 'movie').map((f) => f.id);
      setFavorites(new Set(favIds));
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

      const dbCategories = await database.get<MovieCategoryModel>('movie_categories').query().fetch();
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
        console.log(`✅ ${formattedCategories.length} film kategorisi DB'den yüklendi`);
      } else {
        console.log('⚠️ Film kategorileri bulunamadı. Lütfen ana sayfadan "Güncelle" butonuna basın.');
        setError('Kategoriler bulunamadı. Lütfen ana sayfadan "Tüm Verileri Güncelle" butonuna basarak verileri indirin.');
        setLoading(false);
        return;
      }

      const filteredCategories = formattedCategories.filter(
        (cat) => cat.id !== 'all' && cat.id !== 'favorites'
      );

      const withSpecial: UICategory[] = [
        { id: 'all', name: '🎬 TÜM' },
        { id: 'continue_watching', name: '⏯️ İZLEMEYE DEVAM ET' },
        { id: 'favorites', name: '⭐ FAVORİLERİM' },
        ...filteredCategories,
      ];

      setCategories(withSpecial);
      setSelectedCategory('all');
    } catch (err) {
      console.error('❌ Film kategorileri yükleme hatası:', err);
      setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const loadMovies = async (categoryId: string) => {
    try {
      setLoadingMovies(true);

      if (!database) {
        console.error('❌ Veritabanı başlatılamadı');
        setMovies([]);
        setLoadingMovies(false);
        return;
      }

      const dbMovies = await database.get<MovieModel>('movies').query().fetch();

      if (dbMovies.length === 0) {
        console.log('⚠️ Filmler bulunamadı. Lütfen ana sayfadan "Güncelle" butonuna basın.');
        setMovies([]);
        setLoadingMovies(false);
        return;
      }

      const dbMoviesFormatted: ApiMovie[] = dbMovies.map((m, index) => {
        // İlk birkaç filmin added değerini logla (debug için)
        if (index < 3) {
          console.log(`Film: ${m.name}, added: "${m.added}", release_date: "${m.releaseDate}"`);
        }

        return {
          num: index + 1,
          stream_id: m.streamId,
          name: m.name,
          stream_type: m.streamType,
          stream_icon: m.streamIcon || '',
          rating: m.rating || '',
          rating_5based: m.rating5based || 0,
          category_id: m.categoryId,
          category_ids: m.categoryIds ? JSON.parse(m.categoryIds) : [],
          added: m.added || '',
          container_extension: m.containerExtension || '',
          custom_sid: m.customSid || '',
          direct_source: m.directSource || '',
          streamUrl: undefined,
          info: {
            releasedate: m.releaseDate || '',
            plot: m.plot || '',
            cast: m.cast || '',
            director: m.director || '',
            genre: m.genre || '',
          } as any,
        };
      });

      let apiMovies: ApiMovie[] = [];
      if (categoryId === 'all') {
        apiMovies = dbMoviesFormatted;
      } else if (categoryId === 'continue_watching') {
        const continueWatchingList = await databaseService.getContinueWatching();
        const continueIds = new Set(continueWatchingList.filter((c) => c.type === 'movie').map((c) => c.id));
        apiMovies = dbMoviesFormatted.filter((m) => continueIds.has(m.stream_id.toString()));
      } else if (categoryId === 'favorites') {
        const favList = await databaseService.getFavorites();
        const favIds = new Set(favList.filter((f) => f.type === 'movie').map((f) => f.id));
        apiMovies = dbMoviesFormatted.filter((m) => favIds.has(m.stream_id.toString()));
      } else {
        apiMovies = dbMoviesFormatted.filter(
          (m) =>
            m.category_id === categoryId ||
            (m.category_ids && m.category_ids.includes(parseInt(categoryId)))
        );
      }

      setMovies(apiMovies);
      console.log(`✅ ${apiMovies.length} film veritabanından yüklendi`);
    } catch (err) {
      console.error('Movies load error:', err);
      setMovies([]);
      setError('Filmler yüklenirken hata oluştu');
    } finally {
      setLoadingMovies(false);
    }
  };

  const getMovieYear = (movie: ApiMovie): string => {
    // Önce DB'deki release_date'i kontrol et (Gerçek çıkış yılı)
    if (movie.info?.releasedate && movie.info.releasedate.trim() !== '') {
      const dateStr = movie.info.releasedate.trim();
      // Eğer tarih formatında ise (YYYY-MM-DD, YYYY/MM/DD veya sadece YYYY)
      const yearMatch = dateStr.match(/(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        // Mantıklı film yılı kontrolü (1900-2030)
        if (year >= 1900 && year <= 2030) {
          return year.toString();
        }
      }
    }

    // Fallback olarak "added" alanını kullanma çünkü bu "sisteme eklenme tarihi" 
    // ve çıkış yılıyla alakası yok
    // Bunun yerine boş dön, film detayına girince lazy load ile gerçek yıl gelecek
    return '';
  };

  const filteredMovies = useMemo(() => {
    let filtered = movies;

    if (searchQuery.trim() && searchQuery.trim().length >= 3) {
      // Türkçe karakter desteği ile arama
      filtered = filtered.filter((m) => turkishIncludes(m.name, searchQuery));
    }

    return filtered;
  }, [movies, searchQuery]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (deviceType === 'mobile') {
      setIsCategoryModalVisible(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const numColumns = useMemo(() => {
    if (Platform.OS === 'web') {
      return width > 1200 ? 6 : width > 768 ? 5 : 4;
    }
    // Mobil landscape: 4 sütun (kare kartlar)
    // Tablet: 5 sütun
    // TV: 6 sütun
    if (width > 1200) return 6;
    if (width > 900) return 5;
    return 4;
  }, [width]);

  const handleMoviePress = useCallback(
    (movieId: string) => {
      router.push(`/movies/${movieId}`);
    },
    [router]
  );

  const handleToggleFavorite = useCallback(
    async (movieId: string) => {
      try {
        const movieItem = movies.find((m) => m.stream_id.toString() === movieId);
        if (!movieItem) return;

        const next = await databaseService.toggleFavorite({
          id: movieId,
          type: 'movie',
          title: movieItem.name,
          poster: movieItem.stream_icon || '',
        });

        setFavorites((prev) => {
          const newSet = new Set(prev);
          if (next) {
            newSet.add(movieId);
          } else {
            newSet.delete(movieId);
          }
          return newSet;
        });

        // Sadece favorilerim sayfasındaysak listeyi yenile
        if (selectedCategory === 'favorites') {
          loadMovies('favorites');
        }

        console.log(`✅ Favori ${next ? 'eklendi' : 'çıkarıldı'}: ${movieItem.name}`);
      } catch (err) {
        console.error('Favori güncelleme hatası:', err);
      }
    },
    [movies, selectedCategory]
  );

  const renderMovie = useCallback(
    ({ item }: { item: ApiMovie }) => {
      const movieId = item.stream_id.toString();
      const isFavorite = favorites.has(movieId);

      return (
        <View style={[styles.movieCardWrapper, { width: `${100 / numColumns}%` }]}>
          <MovieCard
            id={movieId}
            title={item.name}
            year={getMovieYear(item)}
            image={
              item.stream_icon || 'https://via.placeholder.com/300x200/2c3e50/ffffff?text=Movie'
            }
            category={item.category_id}
            rating={item.rating}
            rating_5based={item.rating_5based}
            isFavorite={isFavorite}
            onPress={handleMoviePress}
            onFavoritePress={handleToggleFavorite}
          />
        </View>
      );
    },
    [numColumns, handleMoviePress, handleToggleFavorite, favorites]
  );

  const keyExtractor = useCallback((item: ApiMovie) => item.stream_id.toString(), []);

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        {/* Sidebar - sadece tablet ve desktop'ta göster */}
        {deviceType !== 'mobile' && (
          <View style={[styles.sidebar, { width: Math.min(Math.max(width * 0.26, 180), 320) }]}>
            <View style={styles.backRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <Text style={styles.backLabel}>Filmler</Text>
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
        )}

        <View style={styles.catalogWrapper}>
          {/* Mobile hamburger menu */}
          {deviceType === 'mobile' && (
            <View style={styles.mobileHeader}>
              <TouchableOpacity
                style={styles.hamburgerButton}
                onPress={() => setIsCategoryModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="menu" size={28} color="#e2e8f0" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backButtonMobile}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={24} color="#94a3b8" />
                <Text style={styles.backLabelMobile}>Geri</Text>
              </TouchableOpacity>
            </View>
          )}

          <SearchHeader
            title="Filmler"
            onSearch={handleSearch}
            placeholder="Filmlerde ara..."
            itemCount={filteredMovies.length}
            itemLabel="içerik"
          />

          {loadingMovies ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text style={styles.loadingText}>Filmler yükleniyor...</Text>
            </View>
          ) : filteredMovies.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {selectedCategory === 'favorites'
                  ? '⭐ Henüz favori film eklemediniz'
                  : searchQuery
                    ? `"${searchQuery}" için sonuç bulunamadı`
                    : '🎬 Bu kategoride film bulunamadı. Lütfen ana sayfadan güncelleme yapın.'}
              </Text>
            </View>
          ) : (
            <FlashList
              data={filteredMovies}
              renderItem={renderMovie}
              keyExtractor={keyExtractor}
              numColumns={numColumns}
              // @ts-ignore
              estimatedItemSize={350}
              contentContainerStyle={styles.moviesGrid}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>

      {/* Mobile Category Modal */}
      <Modal
        visible={isCategoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kategoriler</Text>
              <TouchableOpacity
                onPress={() => setIsCategoryModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={28} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
            <CategoryList
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              layoutMode="sidebar"
              title=""
              subtitle=""
            />
          </View>
        </View>
      </Modal>
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
    fontFamily: fonts.bold,
  },
  catalogWrapper: {
    flex: 1,
    backgroundColor: '#0033ab',
  },
  moviesGrid: {
    paddingBottom: 48,
    paddingHorizontal: 4,
  },
  movieRow: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  movieRowWide: {
    marginBottom: 18,
    columnGap: 14,
  },
  movieRowCompact: {
    marginBottom: 16,
    columnGap: 10,
  },
  movieCardWrapper: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 4,
    maxWidth: 240,
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
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0b1120',
    borderRadius: 12,
    marginBottom: 12,
  },
  hamburgerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  backLabelMobile: {
    color: '#e2e8f0',
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0b1120',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#e2e8f0',
    fontSize: 24,
    fontFamily: fonts.bold,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Movies;
