import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, useWindowDimensions, TouchableOpacity, Text, Image, Modal, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, Redirect, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bileşenler
import CategoryList from '@/app/components/CategoryList';
import MovieCard from '@/app/components/MovieCard';
import SearchHeader from '@/app/components/SearchHeader';

// Servisler ve Modeller
import { databaseService, storageService, database, type Movie as ApiMovie } from '@/services';
import apiClient from '@/services/api/client';
import MovieModel from '@/services/database/models/Movie';
import MovieCategoryModel from '@/services/database/models/MovieCategory';
import { fonts } from '@/theme/fonts';
import { turkishIncludes } from '@/utils/textUtils';

interface UICategory {
  id: string;
  name: string;
}

const Movies: React.FC = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // State'ler
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
  const [backButtonFocused, setBackButtonFocused] = useState(false);

  // --- Auth ve Init ---
  useEffect(() => {
    initialize();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      }, 100);
      loadFavorites();
      return () => clearTimeout(timer);
    }, [])
  );

  useEffect(() => {
    if (selectedCategory) loadMovies(selectedCategory);
  }, [selectedCategory]);

  const initialize = async () => {
    try {
      setLoading(true);
      const credentials = await storageService.getCredentials();
      if (!credentials) {
        setShouldRedirect(true);
        return;
      }
      await apiClient.loadCredentials();
      await loadFavorites();
      await loadCategories();
    } catch (err) {
      setError('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    const storedFavorites = await databaseService.getFavorites();
    setFavorites(new Set(storedFavorites.filter(f => f.type === 'movie').map(f => f.id)));
  };

  const loadCategories = async () => {
    try {
      if (!database) throw new Error('Database error');
      const dbCategories = await database.get<MovieCategoryModel>('movie_categories').query().fetch();

      const uniqueMap = new Map<string, UICategory>();
      dbCategories.forEach((record) => {
        if (!uniqueMap.has(record.categoryId)) uniqueMap.set(record.categoryId, { id: record.categoryId, name: record.categoryName });
      });

      const formatted = Array.from(uniqueMap.values()).filter(c => c.id !== 'all' && c.id !== 'favorites');
      setCategories([
        { id: 'all', name: '🎬 TÜM' },
        { id: 'continue_watching', name: '⏯️ DEVAM ET' },
        { id: 'favorites', name: '⭐ FAVORİLER' },
        ...formatted,
      ]);
      setSelectedCategory('all');
    } catch (err) {
      setError('Kategori hatası');
    }
  };

  const loadMovies = async (categoryId: string) => {
    try {
      setLoadingMovies(true);
      if (!database) return;

      const dbMovies = await database.get<MovieModel>('movies').query().fetch();

      const allMovies = dbMovies.map((m, i) => ({
        num: i + 1,
        stream_id: m.streamId,
        name: m.name,
        stream_type: 'movie', // VOD için sabit değer
        stream_icon: m.streamIcon || '',
        rating: m.rating || '',
        rating_5based: parseFloat(m.rating || '0') || 0, // String rating'i number'a çevir
        added: m.added || '', // Veritabanından gelen added alanı
        category_id: m.categoryId,
        category_ids: m.categoryIds ? JSON.parse(m.categoryIds) : [],
        container_extension: m.containerExtension || 'mp4', // Varsayılan değer
        custom_sid: m.customSid || '', // Veritabanından oku
        direct_source: m.directSource || '', // Veritabanından oku
        info: { releasedate: m.releaseDate || '' } as any,
      }));

      let filtered = [];
      if (categoryId === 'all') filtered = allMovies;
      else if (categoryId === 'continue_watching') {
        const cw = await databaseService.getContinueWatching();
        const ids = new Set(cw.filter(c => c.type === 'movie').map(c => c.id));
        filtered = allMovies.filter(m => ids.has(m.stream_id.toString()));
      }
      else if (categoryId === 'favorites') {
        filtered = allMovies.filter(m => favorites.has(m.stream_id.toString()));
      }
      else {
        filtered = allMovies.filter(m => m.category_id === categoryId || (m.category_ids && m.category_ids.includes(parseInt(categoryId))));
      }
      setMovies(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMovies(false);
    }
  };

  // --- Grid Hesaplama ---
  const deviceType = width < 768 ? 'mobile' : 'tablet';
  const SIDEBAR_WIDTH = deviceType === 'mobile' ? 0 : 260; // Sabit Sidebar
  const LIST_PADDING = 16;
  const availableWidth = width - SIDEBAR_WIDTH - (LIST_PADDING * 2);

  const numColumns = 4; // Her zaman 4 sütun
  const GAP = 12;

  // Kart Genişliği Hesaplama
  const cardWidth = (availableWidth - ((numColumns - 1) * GAP)) / numColumns;
  const cardHeight = cardWidth * 1.5; // Film Posteri Oranı (2:3)

  const handleToggleFavorite = async (movieId: string) => {
    const movie = movies.find(m => m.stream_id.toString() === movieId);
    if (!movie) return;
    const next = await databaseService.toggleFavorite({
      id: movieId, type: 'movie', title: movie.name, poster: movie.stream_icon || ''
    });
    setFavorites(prev => {
      const newSet = new Set(prev);
      next ? newSet.add(movieId) : newSet.delete(movieId);
      return newSet;
    });
    if (selectedCategory === 'favorites') loadMovies('favorites');
  };

  const filteredMovies = useMemo(() => {
    if (!searchQuery || searchQuery.length < 3) return movies;
    return movies.filter(m => turkishIncludes(m.name, searchQuery));
  }, [movies, searchQuery]);

  const renderMovie = useCallback(({ item }: { item: ApiMovie }) => (
    // Doğrudan MovieCard döndürülüyor, View wrapper kaldırıldı
    <MovieCard
      id={item.stream_id.toString()}
      title={item.name}
      year={item.info?.releasedate?.substring(0, 4) || ''}
      image={item.stream_icon}
      height={cardHeight}
      width={cardWidth}
      category={item.category_id}
      rating={item.rating}
      isFavorite={favorites.has(item.stream_id.toString())}
      onPress={(id) => router.push(`/movies/${id}`)}
      onFavoritePress={handleToggleFavorite}
      style={{ marginBottom: GAP, marginRight: GAP }}
    />
  ), [cardWidth, cardHeight, favorites]);

  if (shouldRedirect) return <Redirect href="/login" />;
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#fff" /></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* SIDEBAR (Yerel Stiller Kullanılıyor) */}
      {deviceType !== 'mobile' && (
        <View style={[styles.sidebar, { width: SIDEBAR_WIDTH }]}>
          <View style={styles.sidebarHeader}>
            <Image source={require('../../assets/images/splash.png')} style={styles.sidebarLogo} resizeMode="contain" />
            <Pressable
              style={[
                styles.backButton,
                backButtonFocused && styles.backButtonFocused
              ]}
              onPress={() => router.back()}
              isTVSelectable={true}
              focusable={true}
              android_tv_focusable={true}
              hasTVPreferredFocus={true}
              onFocus={() => setBackButtonFocused(true)}
              onBlur={() => setBackButtonFocused(false)}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
              <Text style={styles.backText}>GERİ DÖN</Text>
            </Pressable>
          </View>

          <CategoryList
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={(id) => setSelectedCategory(id)}
            layoutMode="sidebar"
            containerStyle={{ flex: 1, width: '100%' }}
          />
        </View>
      )}

      {/* SAĞ İÇERİK */}
      <View style={styles.mainContent}>

        {/* Mobilde Hamburger Menü */}
        {deviceType === 'mobile' && (
          <View style={styles.mobileHeader}>
            <TouchableOpacity onPress={() => setIsCategoryModalVisible(true)}>
              <Ionicons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.mobileTitle}>Filmler</Text>
          </View>
        )}

        <SearchHeader
          title="Filmler"
          onSearch={setSearchQuery}
          placeholder="Film ara..."
          itemCount={filteredMovies.length}
          itemLabel="film"
        />

        {loadingMovies ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#fff" /></View>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: LIST_PADDING, paddingTop: 10 }}>
            <FlashList
              data={filteredMovies}
              renderItem={renderMovie}
              keyExtractor={item => item.stream_id.toString()}
              numColumns={numColumns}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        )}
      </View>

      {/* Mobile Modal */}
      <Modal visible={isCategoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsCategoryModalVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <CategoryList
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={(id) => { setSelectedCategory(id); setIsCategoryModalVisible(false); }}
              layoutMode="sidebar"
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
    flexDirection: 'row', // Yan yana dizilim
    backgroundColor: '#0033ab',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0033ab',
  },
  // SOL MENÜ STİLLERİ (BURAYA EKLENDİ)
  sidebar: {
    backgroundColor: '#020617', // Sidebar arkaplanı
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  sidebarHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  sidebarLogo: {
    width: '80%',
    height: 60,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backButtonFocused: {
    borderColor: '#00E5FF',
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
  },
  backText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  // Sağ İçerik
  mainContent: {
    flex: 1,
    backgroundColor: '#0033ab',
  },
  // Mobile Styles
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#020617',
  },
  mobileTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#020617',
    height: '80%',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  // Gereksiz stiller silindi
});

export default Movies;