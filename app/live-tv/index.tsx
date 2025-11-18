import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, SafeAreaView, Platform, Text, ActivityIndicator, TouchableOpacity, useWindowDimensions, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, Redirect } from 'expo-router';
import { fonts } from '@/theme/fonts';
import CategoryList from '@/app/components/CategoryList';
import ChannelCard from '@/app/components/ChannelCard';
import VideoPlayer from '@/app/components/VideoPlayer';
import channelService from '@/services/channel.service';
import { databaseService, storageService, syncService, database } from '@/services';
import apiClient from '@/services/api/client';
import type { LiveCategory, Channel as ApiChannel } from '@/services';
import ChannelModel from '@/services/database/models/Channel';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingEPG, setLoadingEPG] = useState(false);
  const [epgData, setEpgData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isVideoFullScreen, setIsVideoFullScreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // API'den kategorileri çek
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Sayfa her açıldığında credentials kontrolü yap
  useFocusEffect(
    useCallback(() => {
      checkAuthentication();
    }, [])
  );

  const checkAuthentication = async () => {
    try {
      console.log('🔍 Checking authentication for Live TV...');
      const credentials = await storageService.getCredentials();
      
      if (credentials) {
        console.log('✅ User is authenticated');
        // API client'a credentials'ı yükle
        await apiClient.loadCredentials();
        setIsAuthenticated(true);
        loadCategories();
        loadFavorites();
        
        // Arka planda sync tetikle (UI'ı bloke etmeden)
        syncService.checkAndRunSync('channels').catch(err => {
          console.error('Background sync error:', err);
        });
      } else {
        console.log('❌ User not authenticated');
        setIsAuthenticated(false);
        setShouldRedirect(true);
        setCheckingAuth(false);
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      setIsAuthenticated(false);
      setError('Kimlik doğrulama hatası');
    } finally {
      setCheckingAuth(false);
    }
  };

  // Kategori değiştiğinde kanalları yükle
  useEffect(() => {
    if (selectedCategory) {
      loadChannels(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Önce AsyncStorage'dan kategorileri kontrol et
      const cachedCategories = await storageService.getItem<Category[]>('LIVE_TV_CATEGORIES');
      
      if (cachedCategories && cachedCategories.length > 0) {
        const categoriesWithSpecial: Category[] = [
          { id: 'all', name: '📺 TÜM' },
          { id: 'favorites', name: '⭐ FAVORİLERİM' },
          ...cachedCategories,
        ];
        setCategories(categoriesWithSpecial);
        setLoading(false);
        return;
      }

      // Eğer cache'de yoksa, API'den çek (sadece ilk kez)
      const apiCategories = await channelService.getCategories();
      
      // API'den gelen kategorileri component formatına dönüştür
      const formattedCategories: Category[] = apiCategories.map((cat: LiveCategory) => ({
        id: cat.category_id,
        name: cat.category_name,
      }));

      // AsyncStorage'a kaydet
      await storageService.setItem('LIVE_TV_CATEGORIES', formattedCategories);

      // En başa özel kategoriler ekle
      const categoriesWithSpecial: Category[] = [
        { id: 'all', name: '📺 TÜM' },
        { id: 'favorites', name: '⭐ FAVORİLERİM' },
        ...formattedCategories,
      ];

      setCategories(categoriesWithSpecial);

      // İlk kategoriyi otomatik seç (Tümü)
      setSelectedCategory('all');
    } catch (err) {
      console.error('Kategoriler yüklenemedi:', err);
      setError('Kategoriler yüklenirken bir hata oluştu. Lütfen giriş yaptığınızdan emin olun.');
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async (categoryId: string) => {
    try {
      setLoadingChannels(true);
      
      let apiChannels: ApiChannel[] = [];

      // SWR Stratejisi: Önce database'den çek (stale data)
      if (database) {
        try {
          const dbChannels = await database
            .get<ChannelModel>('channels')
            .query()
            .fetch();

          // Database'den gelen veriyi API formatına çevir
          const dbChannelsFormatted: ApiChannel[] = dbChannels.map((c, index) => ({
            num: index + 1,
            stream_id: c.streamId,
            name: c.name,
            stream_type: c.streamType,
            stream_icon: c.streamIcon || '',
            epg_channel_id: c.epgChannelId || '',
            category_id: c.categoryId,
            category_ids: c.categoryIds ? JSON.parse(c.categoryIds) : [],
            added: c.added || '',
            custom_sid: c.customSid || '',
            tv_archive: c.tvArchive || 0,
            direct_source: c.directSource || '',
            tv_archive_duration: c.tvArchiveDuration || 0,
            thumbnail: c.thumbnail || '',
            streamUrl: undefined,
          }));

          // Kategoriye göre filtrele
          if (categoryId === 'all') {
            apiChannels = dbChannelsFormatted;
          } else if (categoryId === 'favorites') {
            const favoriteIds = Array.from(favorites);
            apiChannels = dbChannelsFormatted.filter(ch => 
              favoriteIds.includes(ch.stream_id.toString())
            );
          } else {
            apiChannels = dbChannelsFormatted.filter(ch =>
              ch.category_id === categoryId || 
              (ch.category_ids && ch.category_ids.includes(parseInt(categoryId)))
            );
          }

          // Veriyi hemen göster (sadece database'den)
          const formattedChannels: Channel[] = apiChannels.map((ch: ApiChannel) => ({
            id: ch.stream_id.toString(),
            name: ch.name,
            logo: ch.stream_icon || ch.name.substring(0, 3).toUpperCase(),
            subscribers: `ID: ${ch.stream_id}`,
            quality: ch.tv_archive ? ['HD', 'Arşiv'] : ['HD'],
            description: `${ch.name} - Canlı yayın`,
            type: categories.find(cat => cat.id === ch.category_id)?.name || 'Canlı TV',
            streamUrl: ch.streamUrl,
          }));
          setChannels(formattedChannels);
          console.log(`✅ ${formattedChannels.length} kanal yüklendi (Kategori: ${categoryId})`);
        } catch (dbError) {
          console.warn('Database read error:', dbError);
          setChannels([]);
        }
      } else {
        // Database yoksa boş liste göster
        setChannels([]);
      }

      // Arka planda sync tetikle (UI'ı bloke etmeden) - sadece "all" kategorisinde
      // SyncService zaten zaman damgası kontrolü yapıyor, gereksiz istek atmıyor
      if (categoryId === 'all') {
        syncService.checkAndRunSync('channels').catch(err => {
          console.error('Background sync error:', err);
        });
      }
    } catch (err) {
      console.error('Kanallar yüklenemedi:', err);
      setChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const storedFavorites = await databaseService.getFavorites();
      const favoriteIds = storedFavorites
        .filter(fav => fav.type === 'channel')
        .map(fav => fav.id);
      setFavorites(new Set(favoriteIds));
    } catch (error) {
      console.error('Favoriler yüklenemedi:', error);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedChannel(null); // Kategori değiştiğinde seçili kanalı temizle
  };

  const handleChannelSelect = async (channel: { id: string; name: string; streamUrl?: string }) => {
    console.log('🎯 handleChannelSelect çağrıldı:', channel);
    
    // Seçilen kanalı bul
    const foundChannel = channels.find(ch => ch.id === channel.id);
    console.log('🔍 Bulunan kanal:', foundChannel);
    
    if (foundChannel) {
      setSelectedChannel(foundChannel);
      setIsVideoFullScreen(true);
      console.log('✅ selectedChannel güncellendi:', foundChannel);
      
      // EPG verilerini yükle
      await loadEPG(channel.id);
    } else {
      console.error('❌ Kanal bulunamadı:', channel.id);
    }
  };

  const handleExitFullScreen = () => {
    setIsVideoFullScreen(false);
    setSelectedChannel(null);
  };

  const loadEPG = async (streamId: string) => {
    try {
      setLoadingEPG(true);
      const epg = await channelService.getEPG(streamId, 5);
      
      // EPG verilerini formatla
      const formattedEPG = epg.map(program => ({
        title: program.title,
        description: program.description || '',
        startTime: new Date(program.start_timestamp * 1000).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        endTime: new Date(program.stop_timestamp * 1000).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
      }));
      
      setEpgData(formattedEPG);
      console.log(`✅ EPG yüklendi: ${formattedEPG.length} program`);
    } catch (error) {
      console.error('EPG yüklenemedi:', error);
      setEpgData([]);
    } finally {
      setLoadingEPG(false);
    }
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleToggleFavorite = async (channelId: string) => {
    try {
      const channel = channels.find(c => c.id === channelId);
      if (!channel) return;

      const next = await databaseService.toggleFavorite({
        id: channelId,
        type: 'channel',
        title: channel.name,
        poster: channel.logo || '',
      });

      // Favori listesini güncelle
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (next) {
          newSet.add(channelId);
        } else {
          newSet.delete(channelId);
        }
        return newSet;
      });
      
      // Eğer favoriler kategorisindeyse kanalları yeniden yükle
      if (selectedCategory === 'favorites') {
        loadChannels('favorites');
      }
    } catch (error) {
      console.error('Favori işlemi başarısız:', error);
    }
  };

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) {
      return channels;
    }

    const query = searchQuery.toLowerCase();
    return channels.filter((channel) =>
      channel.name.toLowerCase().includes(query) ||
      channel.subscribers.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const renderChannelItem = useCallback(({ item }: { item: Channel }) => (
    <View style={styles.channelGridItem}>
      <ChannelCard
        id={item.id}
        name={item.name}
        logo={item.logo}
        subscribers={item.subscribers}
        quality={item.quality}
        isFavorite={favorites.has(item.id)}
        onToggleFavorite={handleToggleFavorite}
        onChannelSelect={handleChannelSelect}
        variant="grid"
      />
    </View>
  ), [favorites, handleChannelSelect, handleToggleFavorite]);

  const channelKeyExtractor = useCallback((item: Channel) => item.id, []);

  // Redirect işlemi
  if (shouldRedirect) {
    return <Redirect href="/login" />;
  }

  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e90ff" />
          <Text style={styles.loadingText}>Kimlik doğrulanıyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Giriş yapılmamışsa
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // Yükleniyor durumu
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e90ff" />
          <Text style={styles.loadingText}>Kategoriler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <Text style={styles.errorHint}>
            Lütfen önce giriş yapın. Ana sayfadan credentials girin.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Kategori yoksa
  if (categories.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>📺 Kategori bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Current channel - güvenli erişim
  const currentChannel = selectedChannel || channels[0] || {
    id: 'default',
    name: 'Kanal Seçin',
    logo: 'TV',
    subscribers: '0',
    quality: ['HD'],
    description: 'Bir kanal seçin',
    type: 'Canlı TV',
    streamUrl: undefined,
  };

  console.log('🔍 Debug Info:');
  console.log('- selectedChannel:', selectedChannel);
  console.log('- channels.length:', channels.length);
  console.log('- currentChannel:', currentChannel);
  console.log('- epgData.length:', epgData.length);

  const isWideLayout = width >= 1024;
  const sidebarWidth = Math.min(Math.max(width * 0.3, 180), 320);
  const horizontalPadding = isWideLayout ? 32 : 20;
  const availableWidth = Math.max(width - sidebarWidth - horizontalPadding * 2, 240);
  const numColumns = Math.max(2, Math.floor(availableWidth / 150));

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[
          styles.content,
          styles.contentRow,
        ]}
      >
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <View style={styles.backRow}>
            <TouchableOpacity
              style={styles.backIconButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={styles.backLinkLabel}>CANLI TV</Text>
          </View>
          <Text style={styles.sidebarSubtitle}>KATEGORİLER</Text>

          <CategoryList
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            isMobileMenuOpen={isMobileMenuOpen}
            onToggleMobileMenu={handleToggleMobileMenu}
            layoutMode={'sidebar'}
            title=""
            subtitle=""
          />
        </View>

        <View style={styles.channelListWrapper}>
          <View style={styles.topBarWrapper}>
            <View>
              <Text style={styles.topBarHeading}>Kanallar</Text>
              <Text style={styles.topBarSubheading}>{filteredChannels.length} kanal</Text>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#dbeafe" />
              <TextInput
                style={styles.searchInput}
                placeholder="Kanallarda ara..."
                placeholderTextColor="rgba(219, 234, 254, 0.6)"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {loadingChannels ? (
            <View style={styles.channelsLoading}>
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text style={styles.loadingText}>Kanallar yükleniyor...</Text>
            </View>
          ) : filteredChannels.length === 0 ? (
            <View style={styles.channelsLoading}>
              <Text style={styles.noChannelsText}>
                {searchQuery
                  ? `"${searchQuery}" için sonuç bulunamadı`
                  : selectedCategory === 'favorites'
                    ? '⭐ Henüz favori kanal eklemediniz'
                    : '📺 Bu kategoride kanal bulunamadı'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredChannels}
              renderItem={renderChannelItem}
              keyExtractor={channelKeyExtractor}
              numColumns={numColumns}
              columnWrapperStyle={
                numColumns > 1
                  ? [styles.channelRow, isWideLayout ? styles.channelRowWide : styles.channelRowCompact]
                  : undefined
              }
              contentContainerStyle={[
                styles.channelsGrid,
                isWideLayout ? styles.channelsGridWide : styles.channelsGridCompact,
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>

      {isVideoFullScreen && (
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.backButton} onPress={handleExitFullScreen}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.fullscreenPlayerWrapper}>
            <VideoPlayer
              channelName={currentChannel.name}
              channelDescription={currentChannel.description}
              channelType={currentChannel.type}
              streamUrl={currentChannel.streamUrl}
              epgData={epgData}
              variant="fullscreen"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0033ab',
  },
  content: {
    flex: 1,
    padding: Platform.OS === 'web' ? 24 : 16,
    gap: Platform.OS === 'web' ? 24 : 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sidebar: {
    marginRight: 12,
    backgroundColor: '#0b1120',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.7)',
    shadowColor: '#020617',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  backLinkLabel: {
    color: '#e2e8f0',
    fontSize: 15,
    letterSpacing: 0.4,
    fontFamily: fonts.semibold,
  },
  sidebarSubtitle: {
    color: '#e61919',
    fontSize: 14,
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontFamily: fonts.bold,
    
  },
  channelListWrapper: {
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1d4ed8',
    gap: 6,
    flex: 1,
    maxWidth: 420,
    shadowColor: '#1d4ed8',
    shadowOpacity: Platform.OS === 'web' ? 0.25 : 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  searchInput: {
    flex: 1,
    color: '#dbeafe',
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  channelsGrid: {
    paddingBottom: 48,
    paddingHorizontal: 4,
  },
  channelsGridWide: {
    paddingHorizontal: 12,
  },
  channelsGridCompact: {
    paddingHorizontal: 4,
  },
  channelRow: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  channelRowWide: {
    marginBottom: 12,
    columnGap: 12,
  },
  channelRowCompact: {
    marginBottom: 12,
    columnGap: 10,
  },
  channelGridItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
    fontFamily: fonts.semibold,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: fonts.semibold,
  },
  errorHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
  channelsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noChannelsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: fonts.semibold,
  },
  loginButton: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    minWidth: 200,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 32 : 48,
    left: 24,
    zIndex: 2,
    backgroundColor: 'rgba(13, 27, 42, 0.7)',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  fullscreenPlayerWrapper: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 48 : 64,
  },
});

export default LiveTv;