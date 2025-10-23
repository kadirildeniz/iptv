import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Platform, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import CategoryList from '@/app/components/CategoryList';
import ChannelCard from '@/app/components/ChannelCard';
import VideoPlayer from '@/app/components/VideoPlayer';
import channelService from '@/services/channel.service';
import storageService from '@/services/storage.service';
import type { LiveCategory, Channel as ApiChannel } from '@/services';

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

  // API'den kategorileri çek
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      console.log('🔍 Checking authentication for Live TV...');
      const credentials = await storageService.getCredentials();
      
      if (credentials) {
        console.log('✅ User is authenticated');
        setIsAuthenticated(true);
        loadCategories();
        loadFavorites();
      } else {
        console.log('❌ User not authenticated');
        setIsAuthenticated(false);
        setError('Lütfen önce giriş yapın');
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

      const apiCategories = await channelService.getCategories();
      
      // API'den gelen kategorileri component formatına dönüştür
      const formattedCategories: Category[] = apiCategories.map((cat: LiveCategory) => ({
        id: cat.category_id,
        name: cat.category_name,
      }));

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

      if (categoryId === 'all') {
        // Tüm kanalları getir (category_id olmadan)
        apiChannels = await channelService.getChannels();
      } else if (categoryId === 'favorites') {
        // Favori kanalları getir
        const favoriteIds = Array.from(favorites);
        if (favoriteIds.length > 0) {
          const allChannels = await channelService.getChannels();
          apiChannels = allChannels.filter(ch => favoriteIds.includes(ch.stream_id.toString()));
        }
      } else {
        // Belirli kategorideki kanalları getir
        apiChannels = await channelService.getChannelsByCategory(categoryId);
      }

      // API'den gelen kanalları component formatına dönüştür
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
    } catch (err) {
      console.error('Kanallar yüklenemedi:', err);
      setChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const storedFavorites = await storageService.getFavorites();
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
      console.log('✅ selectedChannel güncellendi:', foundChannel);
      
      // EPG verilerini yükle
      await loadEPG(channel.id);
    } else {
      console.error('❌ Kanal bulunamadı:', channel.id);
    }
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
    const newFavorites = new Set(favorites);
    
    try {
      if (newFavorites.has(channelId)) {
        // Favorilerden çıkar
        newFavorites.delete(channelId);
        await storageService.removeFromFavorites(channelId);
      } else {
        // Favorilere ekle
        newFavorites.add(channelId);
        await storageService.addToFavorites({
          id: channelId,
          type: 'channel',
        });
      }
      setFavorites(newFavorites);
      
      // Eğer favoriler kategorisindeyse kanalları yeniden yükle
      if (selectedCategory === 'favorites') {
        loadChannels('favorites');
      }
    } catch (error) {
      console.error('Favori işlemi başarısız:', error);
    }
  };

  // Kimlik doğrulama kontrolü
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
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>🔐 Giriş Gerekli</Text>
          <Text style={styles.errorHint}>
            Live TV'yi kullanmak için önce giriş yapmanız gerekiyor.
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Left Panel - Categories */}
        <CategoryList
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={handleToggleMobileMenu}
        />

        {/* Middle Panel - Channel Cards */}
        <ScrollView 
          style={styles.channelsContainer}
          contentContainerStyle={styles.channelsContent}
          showsVerticalScrollIndicator={false}
        >
          {loadingChannels ? (
            <View style={styles.channelsLoading}>
              <ActivityIndicator size="large" color="#1e90ff" />
              <Text style={styles.loadingText}>Kanallar yükleniyor...</Text>
            </View>
          ) : channels.length === 0 ? (
            <View style={styles.channelsLoading}>
              <Text style={styles.noChannelsText}>
                {selectedCategory === 'favorites' 
                  ? '⭐ Henüz favori kanal eklemediniz' 
                  : '📺 Bu kategoride kanal bulunamadı'}
              </Text>
            </View>
          ) : (
            channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                id={channel.id}
                name={channel.name}
                logo={channel.logo}
                subscribers={channel.subscribers}
                quality={channel.quality}
                isFavorite={favorites.has(channel.id)}
                onToggleFavorite={handleToggleFavorite}
                onChannelSelect={handleChannelSelect}
              />
            ))
          )}
        </ScrollView>

        {/* Right Panel - Video Player */}
        <VideoPlayer
          channelName={currentChannel.name}
          channelDescription={currentChannel.description}
          channelType={currentChannel.type}
          streamUrl={currentChannel.streamUrl}
          epgData={epgData}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
    ...(Platform.OS === 'web' && {
      background: 'linear-gradient(135deg, #0d1b2a 0%, #1e3a8a 50%, #0d1b2a 100%)',
    }),
  },
  content: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    padding: Platform.OS === 'web' ? 24 : 16,
    gap: Platform.OS === 'web' ? 24 : 16,
  },
  channelsContainer: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 450 : '100%',
    ...(Platform.OS === 'web' && {
      minWidth: 400,
    }),
  },
  channelsContent: {
    paddingBottom: 20,
    paddingTop: Platform.OS === 'web' ? 0 : 20,
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
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  errorHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
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
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  loginButton: {
    backgroundColor: '#1e90ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    minWidth: 200,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
});

export default LiveTv;