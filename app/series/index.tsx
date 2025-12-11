import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, useWindowDimensions, TouchableOpacity, Text, Image, Modal, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, Redirect, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Bileşenler
import CategoryList from '@/app/components/CategoryList';
import SeriesCard from '@/app/components/SeriesCard';
import SearchHeader from '@/app/components/SearchHeader';

// Servisler ve Modeller
import { databaseService, storageService, database, type Series as ApiSeries } from '@/services';
import SeriesModel from '@/services/database/models/Series';
import SeriesCategoryModel from '@/services/database/models/SeriesCategory';
import apiClient from '@/services/api/client';
import { fonts } from '@/theme/fonts';
import { turkishIncludes } from '@/utils/textUtils';

interface UICategory {
  id: string;
  name: string;
}

const Series: React.FC = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // State'ler
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
    if (selectedCategory) loadSeries(selectedCategory);
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
    setFavorites(new Set(storedFavorites.filter(f => f.type === 'series').map(f => f.id)));
  };

  const loadCategories = async () => {
    try {
      if (!database) throw new Error('Database error');
      const dbCategories = await database.get<SeriesCategoryModel>('series_categories').query().fetch();

      const uniqueMap = new Map<string, UICategory>();
      dbCategories.forEach((record) => {
        if (!uniqueMap.has(record.categoryId)) uniqueMap.set(record.categoryId, { id: record.categoryId, name: record.categoryName });
      });

      const formatted = Array.from(uniqueMap.values()).filter(c => c.id !== 'all' && c.id !== 'favorites');
      setCategories([
        { id: 'all', name: '📺 TÜM' },
        { id: 'continue_watching', name: '⏯️ DEVAM ET' },
        { id: 'favorites', name: '⭐ FAVORİLER' },
        ...formatted,
      ]);
      setSelectedCategory('all');
    } catch (err) {
      setError('Kategori hatası');
    }
  };

  const loadSeries = async (categoryId: string) => {
    try {
      setLoadingSeries(true);
      if (!database) return;

      const dbSeries = await database.get<SeriesModel>('series').query().fetch();

      const allSeries = dbSeries.map((s, i) => {
        return {
          num: i + 1,
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
          seasons: s.seasons ? JSON.parse(s.seasons) : [], // Seasons alanını ekle
        };
      });

      // Sezon sayılarını işle
      const seasonsMap = new Map<string, number>();
      dbSeries.forEach(s => {
        const seasons = s.seasons ? JSON.parse(s.seasons) : [];
        if (Array.isArray(seasons) && seasons.length > 0) {
          seasonsMap.set(s.seriesId.toString(), seasons.length);
        }
      });
      setSeasonsCount(seasonsMap);

      let filtered = [];
      if (categoryId === 'all') filtered = allSeries;
      else if (categoryId === 'continue_watching') {
        const cw = await databaseService.getContinueWatching();
        // Dizi ID formatı: seriesId_S1_E1 -> split ile seriesId al
        const ids = new Set(cw.filter(c => c.type === 'series').map(c => c.id.split('_')[0]));
        filtered = allSeries.filter(s => ids.has(s.series_id.toString()));
      }
      else if (categoryId === 'favorites') {
        filtered = allSeries.filter(s => favorites.has(s.series_id.toString()));
      }
      else {
        filtered = allSeries.filter(s => s.category_id === categoryId || (s.category_ids && s.category_ids.includes(parseInt(categoryId))));
      }
      setSeries(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSeries(false);
    }
  };

  // --- Grid Hesaplama ---
  const isTV = Platform.isTV;
  const deviceType = width < 768 ? 'mobile' : 'tablet';
  const SIDEBAR_WIDTH = deviceType === 'mobile' ? 0 : 260; // Sabit Sidebar
  const LIST_PADDING = 10;
  const availableWidth = width - SIDEBAR_WIDTH - (LIST_PADDING * 2);

  const numColumns = isTV ? 5 : 4; // TV'de 5 sütun, diğerlerinde 4 sütun
  const GAP = 12;

  // Kart Genişliği Hesaplama - sabit oran ile
  const cardWidth = (availableWidth - ((numColumns - 1) * GAP)) / numColumns;
  const cardHeight = cardWidth * 1.5; // Dizi Posteri Oranı (2:3 = 0.67 aspect ratio)

  const handleToggleFavorite = async (seriesId: string) => {
    const seriesItem = series.find(s => s.series_id.toString() === seriesId);
    if (!seriesItem) return;
    const next = await databaseService.toggleFavorite({
      id: seriesId, type: 'series', title: seriesItem.name, cover: seriesItem.cover || ''
    });
    setFavorites(prev => {
      const newSet = new Set(prev);
      next ? newSet.add(seriesId) : newSet.delete(seriesId);
      return newSet;
    });
    if (selectedCategory === 'favorites') loadSeries('favorites');
  };

  const filteredSeries = useMemo(() => {
    if (!searchQuery || searchQuery.length < 3) return series;
    return series.filter(s => turkishIncludes(s.name, searchQuery));
  }, [series, searchQuery]);

  const renderSeriesItem = useCallback(({ item }: { item: ApiSeries }) => {
    const seriesId = item.series_id.toString();
    const seasons = seasonsCount.get(seriesId) || 0;

    return (
      // Gereksiz View wrapper silindi
      <SeriesCard
        id={seriesId}
        title={item.name}
        year={item.releaseDate || ''}
        image={item.cover}
        height={cardHeight}
        width={cardWidth} // Genişliği buradan alıyor
        category={item.category_id}
        seasons={seasons}
        isFavorite={favorites.has(seriesId)}
        onPress={(id) => router.push(`/series/${id}`)}
        onFavoritePress={handleToggleFavorite}
        style={{ marginBottom: GAP, marginRight: GAP }}
      />
    );
  }, [cardWidth, cardHeight, favorites, seasonsCount]);

  if (shouldRedirect) return <Redirect href="/login" />;
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#fff" /></View>;

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['bottom']}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* SIDEBAR (Yerel Stiller Kullanılıyor) */}
        {deviceType !== 'mobile' && (
          <View style={[styles.sidebar, { width: SIDEBAR_WIDTH }]}>
            <View style={styles.sidebarHeader}>
              <Pressable
                style={[
                  styles.backButton,
                  isTV && backButtonFocused && styles.backButtonFocused
                ]}
                onPress={() => router.back()}
                isTVSelectable={isTV}
                focusable={isTV}
                android_tv_focusable={isTV}
                hasTVPreferredFocus={isTV}
                onFocus={isTV ? () => setBackButtonFocused(true) : undefined}
                onBlur={isTV ? () => setBackButtonFocused(false) : undefined}
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
              <Text style={styles.mobileTitle}>Diziler</Text>
            </View>
          )}

          <SearchHeader
            title="Diziler"
            onSearch={setSearchQuery}
            placeholder="Dizi ara..."
            itemCount={filteredSeries.length}
            itemLabel="dizi"
          />

          {loadingSeries ? (
            <View style={styles.center}><ActivityIndicator size="large" color="#fff" /></View>
          ) : (
            <View style={{ flex: 1, paddingHorizontal: LIST_PADDING, paddingTop: 10 }}>
              <FlashList
                data={filteredSeries}
                renderItem={renderSeriesItem}
                keyExtractor={item => item.series_id.toString()}
                numColumns={numColumns}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 8, paddingLeft: 8 }}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#0033ab',
  },
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
    backgroundColor: '#1a365d', // Sidebar arkaplanı (daha açık)
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  sidebarHeader: {
    marginBottom: 10,
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
    height: '50%',
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

export default Series;