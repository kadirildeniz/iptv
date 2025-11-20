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
import { Stack, useRouter, Redirect } from 'expo-router';
import CategoryList from '@/app/components/CategoryList';
import MovieCard from '@/app/components/MovieCard';
import { databaseService, storageService, database, type Movie as ApiMovie } from '@/services';
import apiClient from '@/services/api/client';
import MovieModel from '@/services/database/models/Movie';
import MovieCategoryModel from '@/services/database/models/MovieCategory';
import { fonts } from '@/theme/fonts';

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

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadMovies(selectedCategory);
    }
  }, [selectedCategory]);

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

      const dbMoviesFormatted: ApiMovie[] = dbMovies.map((m, index) => ({
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
      }));

      let apiMovies: ApiMovie[] = [];
      if (categoryId === 'all') {
        apiMovies = dbMoviesFormatted;
      } else if (categoryId === 'favorites') {
        apiMovies = dbMoviesFormatted.filter((m) => favorites.has(m.stream_id.toString()));
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
    if (movie.info?.releasedate) {
      const year = movie.info.releasedate.slice(0, 4);
      if (year && !isNaN(Number(year))) {
        return year;
      }
    }

    if (movie.added) {
      const date = new Date(Number(movie.added) * 1000);
      const year = date.getFullYear();
      if (!isNaN(year)) {
        return year.toString();
      }
    }

    return '';
  };

  const filteredMovies = useMemo(() => {
    let filtered = movies;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(q));
    }

    return filtered;
  }, [movies, searchQuery]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const numColumns = useMemo(() => {
    if (Platform.OS === 'web') {
      return width > 1200 ? 5 : width > 768 ? 4 : 3;
    }
    return width > 768 ? 3 : 2;
  }, [width]);

  const handleMoviePress = useCallback(
    (movieId: string) => {
      router.push(`/movies/${movieId}`);
    },
    [router]
  );

  const renderMovie = useCallback(
    ({ item }: { item: ApiMovie }) => {
      return (
        <View style={[styles.movieCardWrapper, { width: `${100 / numColumns}%` }]}>
          <MovieCard
            id={item.stream_id.toString()}
            title={item.name}
            year={getMovieYear(item)}
            image={
              item.stream_icon || 'https://via.placeholder.com/300x200/2c3e50/ffffff?text=Movie'
            }
            category={item.category_id}
            rating={item.rating}
            rating_5based={item.rating_5based}
            onPress={handleMoviePress}
          />
        </View>
      );
    },
    [numColumns, handleMoviePress]
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

        <View style={styles.catalogWrapper}>
          <View style={styles.topBarWrapper}>
            <View>
              <Text style={styles.topBarHeading}>Filmler</Text>
              <Text style={styles.topBarSubheading}>{filteredMovies.length} içerik</Text>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#dbeafe" />
              <TextInput
                style={styles.searchInput}
                placeholder="Filmlerde ara..."
                placeholderTextColor="rgba(219, 234, 254, 0.6)"
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

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
            <FlatList
              data={filteredMovies}
              renderItem={renderMovie}
              keyExtractor={keyExtractor}
              numColumns={numColumns}
              columnWrapperStyle={
                numColumns > 1
                  ? [
                      styles.movieRow,
                      Platform.OS === 'web' ? styles.movieRowWide : styles.movieRowCompact,
                    ]
                  : undefined
              }
              contentContainerStyle={styles.moviesGrid}
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
    fontSize: 18,
    letterSpacing: 0.5,
    marginBottom: 2,
    fontFamily: fonts.bold,
  },
  topBarSubheading: {
    color: 'rgba(226, 232, 240, 0.75)',
    fontSize: 11,
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
});

export default Movies;
