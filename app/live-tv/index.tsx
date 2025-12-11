import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform, Text, ActivityIndicator, Pressable, useWindowDimensions, Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, Redirect, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/theme/fonts';
import CategoryList from '@/app/components/CategoryList';
import ChannelCard from '@/app/components/ChannelCard';
import SearchHeader from '@/app/components/SearchHeader';
import { databaseService, storageService, database } from '@/services';
import apiClient from '@/services/api/client';
import { buildStreamUrl } from '@/services/api/endpoints';
import ChannelModel from '@/services/database/models/Channel';
import LiveCategoryModel from '@/services/database/models/LiveCategory';
import { turkishIncludes } from '@/utils/textUtils';
import { TV_BUTTON_FOCUS_STYLE } from '@/constants/tvStyles';

// Tipler
interface Channel {
  id: string;
  name: string;
  logo: string;
  subscribers: string;
  quality: string[];
  description: string;
  type: string;
  streamUrl?: string;
}

interface Category {
  id: string;
  name: string;
}

const LiveTv: React.FC = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // State'ler
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [backButtonFocused, setBackButtonFocused] = useState(false);

  // --- Auth ve Yükleme Mantığı ---
  useEffect(() => {
    checkAuthentication();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Ekranı zorla YATAY yap
      const timer = setTimeout(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      }, 100);
      loadFavorites();
      return () => clearTimeout(timer);
    }, [])
  );

  const checkAuthentication = async () => {
    try {
      const credentials = await storageService.getCredentials();
      if (credentials) {
        await apiClient.loadCredentials();
        loadCategories();
        loadFavorites();
      } else {
        setShouldRedirect(true);
      }
    } catch (error) {
      setError('Kimlik doğrulama hatası');
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      loadChannels(selectedCategory);
    }
  }, [selectedCategory, favorites]);

  // --- Veri Çekme Fonksiyonları ---
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!database) { throw new Error('Database not initialized'); }

      const dbCategories = await database.get<LiveCategoryModel>('live_categories').query().fetch();

      if (dbCategories.length === 0) {
        setError('Kategoriler bulunamadı. Lütfen ana sayfadan güncelleme yapın.');
        setLoading(false);
        return;
      }

      const uniqueMap = new Map<string, Category>();
      dbCategories.forEach((record) => {
        if (!uniqueMap.has(record.categoryId)) {
          uniqueMap.set(record.categoryId, { id: record.categoryId, name: record.categoryName });
        }
      });

      const formattedCategories = Array.from(uniqueMap.values()).filter(c => c.id !== 'all' && c.id !== 'favorites');

      setCategories([
        { id: 'all', name: '📺 TÜM' },
        { id: 'favorites', name: '⭐ FAVORİLERİM' },
        ...formattedCategories,
      ]);
      setSelectedCategory('all');
    } catch (err) {
      setError('Kategori yükleme hatası');
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async (categoryId: string) => {
    try {
      setLoadingChannels(true);
      if (!database) return;

      const dbChannels = await database.get<ChannelModel>('channels').query().fetch();
      const credentials = apiClient.getCredentials();
      const baseUrl = apiClient.getBaseUrl();

      if (!credentials || !baseUrl) {
        setChannels([]);
        return;
      }

      // Ham veriyi işle
      const allChannels = dbChannels.map(c => ({
        stream_id: c.streamId,
        name: c.name,
        stream_icon: c.streamIcon || '',
        category_id: c.categoryId,
        category_ids: c.categoryIds ? JSON.parse(c.categoryIds) : [],
        tv_archive: c.tvArchive || 0,
        streamUrl: buildStreamUrl(baseUrl, credentials.username, credentials.password, c.streamId.toString(), 'ts')
      }));

      // Filtrele
      let filtered;
      if (categoryId === 'all') {
        filtered = allChannels;
      } else if (categoryId === 'favorites') {
        filtered = allChannels.filter(ch => favorites.has(ch.stream_id.toString()));
      } else {
        filtered = allChannels.filter(ch =>
          ch.category_id === categoryId || (ch.category_ids && ch.category_ids.includes(parseInt(categoryId)))
        );
      }

      setChannels(filtered.map(ch => ({
        id: ch.stream_id.toString(),
        name: ch.name,
        logo: ch.stream_icon || '',
        subscribers: `ID: ${ch.stream_id}`,
        quality: ch.tv_archive ? ['HD', 'REC'] : ['HD'],
        description: 'Canlı Yayın',
        type: 'Canlı TV',
        streamUrl: ch.streamUrl,
      })));

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadFavorites = async () => {
    const storedFavorites = await databaseService.getFavorites();
    setFavorites(new Set(storedFavorites.filter(f => f.type === 'channel').map(f => f.id)));
  };

  // --- Etkileşimler ---
  const handleToggleFavorite = async (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return;
    const next = await databaseService.toggleFavorite({
      id: channelId, type: 'channel', title: channel.name, poster: channel.logo || ''
    });
    setFavorites(prev => {
      const newSet = new Set(prev);
      next ? newSet.add(channelId) : newSet.delete(channelId);
      return newSet;
    });
  };

  const filteredChannels = useMemo(() => {
    if (!searchQuery || searchQuery.length < 3) return channels;
    return channels.filter(c => turkishIncludes(c.name, searchQuery));
  }, [channels, searchQuery]);

  // --- Grid Hesaplamaları ---
  const isTV = Platform.isTV;
  const deviceType = width < 768 ? 'mobile' : 'tablet';
  // Sidebar genişliği sabit ve net olsun
  const SIDEBAR_WIDTH = deviceType === 'mobile' ? 0 : 260;
  // Sağ taraftaki liste için kalan net alan (Paddingleri düşüy oruz)
  const LIST_PADDING = 10;
  const availableWidth = width - SIDEBAR_WIDTH - (LIST_PADDING * 2);

  const numColumns = isTV ? 5 : 4; // TV'de 5, telefon/tablette 4 sütun
  const GAP = 10;
  // Matematiksel olarak tam sığan kart genişliği
  const cardWidth = (availableWidth - ((numColumns - 1) * GAP)) / numColumns;
  const cardHeight = cardWidth; // Kare olsun (TV kanalı için)

  const renderChannelItem = useCallback(({ item }: { item: Channel }) => (
    <View style={{ width: cardWidth, marginBottom: GAP, paddingHorizontal: GAP / 2 }}>
      <ChannelCard
        id={item.id}
        name={item.name}
        logo={item.logo}
        subscribers={item.subscribers}
        quality={item.quality}
        isFavorite={favorites.has(item.id)}
        onToggleFavorite={handleToggleFavorite}
        onChannelSelect={() => router.push({ pathname: '/player', params: { url: item.streamUrl, title: item.name } })}
        variant="grid"
        height={cardHeight}
      />
    </View>
  ), [cardWidth, cardHeight, favorites, GAP]);

  // --- Render ---
  if (shouldRedirect) return <Redirect href="/login" />;
  if (checkingAuth || loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#fff" /></View>;

  return (
    // SafeAreaView ile sar
    <SafeAreaView style={styles.safeAreaContainer} edges={['bottom']}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* SIDEBAR (Mobilde gizli) */}
        {deviceType !== 'mobile' && (
          <View style={[styles.sidebar, { width: SIDEBAR_WIDTH }]}>
            <View style={styles.sidebarHeader}>
              <Pressable
                isTVSelectable={isTV}
                focusable={isTV}
                android_tv_focusable={isTV}
                hasTVPreferredFocus={isTV}
                onFocus={isTV ? () => setBackButtonFocused(true) : undefined}
                onBlur={isTV ? () => setBackButtonFocused(false) : undefined}
                style={[
                  styles.backButton,
                  isTV && backButtonFocused && styles.backButtonFocused
                ]}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
                <Text style={styles.backText}>GERİ DÖN</Text>
              </Pressable>
            </View>

            {/* Kategori Listesi */}
            <CategoryList
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={(id) => setSelectedCategory(id)}
              layoutMode="sidebar"
              containerStyle={{ flex: 1, width: '100%' }} // Tam genişlik
            />
          </View>
        )}

        {/* SAĞ İÇERİK ALANI */}
        <View style={styles.mainContent}>
          <SearchHeader
            title="Kanallar"
            onSearch={setSearchQuery}
            placeholder="Kanal ara..."
            itemCount={filteredChannels.length}
            itemLabel="kanal"
          />

          {loadingChannels ? (
            <View style={styles.centerContainer}><ActivityIndicator size="large" color="#fff" /></View>
          ) : (
            <View style={{ flex: 1, paddingHorizontal: LIST_PADDING, paddingTop: 10 }}>
              <FlashList
                data={filteredChannels}
                renderItem={renderChannelItem}
                keyExtractor={item => item.id}
                numColumns={numColumns}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 8, paddingLeft: 8 }}
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// Temizlenmiş ve Sadeleştirilmiş Stiller
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#0033ab',
  },
  container: {
    flex: 1,
    flexDirection: 'row', // Yan yana dizilim
    backgroundColor: '#0033ab', // Ana arka plan
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0033ab',
  },
  // SOL MENÜ
  sidebar: {
    backgroundColor: '#1a365d', // Açık sidebar rengi
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  sidebarHeader: {
    marginBottom: 10,
    alignItems: 'center',
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
  // SAĞ İÇERİK
  mainContent: {
    flex: 1, // Kalan alanı doldur
    backgroundColor: '#0033ab',
  },
  // Kullanılmayan tüm eski stiller silindi (errorText, channelRow vb.)
});

export default LiveTv;
