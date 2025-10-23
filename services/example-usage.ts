/**
 * Xtream Codes IPTV Services Kullanım Örnekleri
 * 
 * Bu dosya sadece örnek amaçlıdır.
 * Gerçek uygulamanızda kullanmayın.
 */

import {
  authService,
  channelService,
  movieService,
  seriesService,
  storageService,
} from './index';

// ============================================
// 1. AUTH SERVICE ÖRNEKLERI (Xtream Codes)
// ============================================

async function authExamples() {
  try {
    // Giriş yap - Host, username ve password ile
    const accountInfo = await authService.login({
      host: 'zunexle.live',
      port: '8080',
      username: 'tGz3GyyBN3Dc',
      password: '11auBENYMpS1',
      protocol: 'http', // veya 'https'
    });

    console.log('Kullanıcı bilgileri:', accountInfo.user_info);
    console.log('Sunucu bilgileri:', accountInfo.server_info);
    console.log('Hesap durumu:', accountInfo.user_info.status);
    console.log('Bitiş tarihi:', accountInfo.user_info.exp_date);
    console.log('Maks bağlantı:', accountInfo.user_info.max_connections);

    // Hesap durumunu kontrol et
    const status = await authService.checkAccountStatus();
    console.log('Hesap aktif mi?', status.isActive);
    console.log('Kalan gün sayısı:', status.daysRemaining);

    // Kullanıcı bilgilerini al
    const credentials = authService.getCredentials();
    console.log('Mevcut credentials:', credentials);

    // Giriş yapılmış mı kontrol et
    const isAuth = authService.isAuthenticated();
    console.log('Kullanıcı girişli mi?', isAuth);

    // Çıkış yap
    await authService.logout();
  } catch (error) {
    console.error('Auth hatası:', error);
  }
}

// ============================================
// 2. CHANNEL SERVICE ÖRNEKLERI (Live TV)
// ============================================

async function channelExamples() {
  try {
    // Canlı TV kategorilerini getir
    const categories = await channelService.getCategories();
    console.log('Kategoriler:', categories);
    categories.forEach((cat) => {
      console.log(`- ${cat.category_name} (ID: ${cat.category_id})`);
    });

    // Tüm kanalları getir
    const allChannels = await channelService.getChannels();
    console.log('Toplam kanal sayısı:', allChannels.length);
    console.log('İlk kanal:', allChannels[0]);
    console.log('Stream URL:', allChannels[0].streamUrl);

    // Belirli kategorideki kanalları getir (örn: Spor kanalları)
    const sportChannels = await channelService.getChannelsByCategory('1');
    console.log('Spor kanalları:', sportChannels.length);

    // Tek bir kanalı getir
    const channel = await channelService.getChannelById('12345');
    if (channel) {
      console.log('Kanal adı:', channel.name);
      console.log('Stream URL:', channel.streamUrl);
      console.log('EPG kanal ID:', channel.epg_channel_id);
    }

    // Kanal ara
    const searchResults = await channelService.searchChannels('TRT');
    console.log('Arama sonuçları:', searchResults.length);

    // EPG (Program rehberi) getir
    const epg = await channelService.getEPG('12345', 10);
    console.log('Program rehberi:', epg);
    epg.forEach((program) => {
      console.log(`${program.start} - ${program.end}: ${program.title}`);
    });

    // Birden fazla kanal için EPG
    const multiEpg = await channelService.getMultipleEPG(['12345', '12346']);
    console.log('Çoklu EPG:', multiEpg);
  } catch (error) {
    console.error('Channel hatası:', error);
  }
}

// ============================================
// 3. MOVIE SERVICE ÖRNEKLERI (VOD)
// ============================================

async function movieExamples() {
  try {
    // Film kategorilerini getir
    const categories = await movieService.getCategories();
    console.log('Film kategorileri:', categories);

    // Tüm filmleri getir
    const allMovies = await movieService.getMovies();
    console.log('Toplam film sayısı:', allMovies.length);
    console.log('İlk film:', allMovies[0]);
    console.log('Stream URL:', allMovies[0].streamUrl);

    // Kategoriye göre filmleri getir
    const actionMovies = await movieService.getMoviesByCategory('1');
    console.log('Aksiyon filmleri:', actionMovies.length);

    // Popüler filmleri getir
    const popularMovies = await movieService.getPopularMovies(undefined, 10);
    console.log('Popüler filmler (Top 10):', popularMovies);

    // Son eklenen filmleri getir
    const recentMovies = await movieService.getRecentMovies(undefined, 10);
    console.log('Son eklenen filmler:', recentMovies);

    // Film ara
    const searchResults = await movieService.searchMovies('Avatar');
    console.log('Arama sonuçları:', searchResults);

    // Film detaylarını getir
    const movieInfo = await movieService.getMovieInfo('12345');
    console.log('Film bilgileri:', movieInfo.info);
    console.log('Film adı:', movieInfo.info.name);
    console.log('IMDB Rating:', movieInfo.info.rating_count_kinopoisk);
    console.log('Açıklama:', movieInfo.info.plot);
    console.log('Yönetmen:', movieInfo.info.director);
    console.log('Oyuncular:', movieInfo.info.cast);
    console.log('Süre:', movieInfo.info.duration);
  } catch (error) {
    console.error('Movie hatası:', error);
  }
}

// ============================================
// 4. SERIES SERVICE ÖRNEKLERI
// ============================================

async function seriesExamples() {
  try {
    // Dizi kategorilerini getir
    const categories = await seriesService.getCategories();
    console.log('Dizi kategorileri:', categories);

    // Tüm dizileri getir
    const allSeries = await seriesService.getSeries();
    console.log('Toplam dizi sayısı:', allSeries.length);
    console.log('İlk dizi:', allSeries[0]);

    // Kategoriye göre dizileri getir
    const dramaSeries = await seriesService.getSeriesByCategory('1');
    console.log('Dram dizileri:', dramaSeries.length);

    // Popüler dizileri getir
    const popularSeries = await seriesService.getPopularSeries(undefined, 10);
    console.log('Popüler diziler:', popularSeries);

    // Son eklenen dizileri getir
    const recentSeries = await seriesService.getRecentSeries(undefined, 10);
    console.log('Son eklenen diziler:', recentSeries);

    // Dizi ara
    const searchResults = await seriesService.searchSeries('Breaking Bad');
    console.log('Arama sonuçları:', searchResults);

    // Dizi detaylarını getir (sezonlar ve bölümler)
    const seriesInfo = await seriesService.getSeriesInfo('12345');
    console.log('Dizi bilgileri:', seriesInfo.info);
    console.log('Sezonlar:', seriesInfo.seasons);
    console.log('Bölümler:', seriesInfo.episodes);

    // Örnek: 1. sezonun bölümleri
    const season1Episodes = seriesInfo.episodes['1'];
    console.log('1. sezon bölümleri:', season1Episodes);
    season1Episodes?.forEach((ep) => {
      console.log(`S${ep.season}E${ep.episode_num}: ${ep.title}`);
      console.log(`Stream URL: ${ep.streamUrl}`);
    });

    // Belirli bir sezonun bölümlerini getir
    const episodes = await seriesService.getEpisodesBySeason('12345', 1);
    console.log('Sezon 1 bölümleri:', episodes);
  } catch (error) {
    console.error('Series hatası:', error);
  }
}

// ============================================
// 5. STORAGE SERVICE ÖRNEKLERI
// ============================================

async function storageExamples() {
  try {
    // Favorilere ekle
    await storageService.addToFavorites({
      id: '12345',
      type: 'movie',
    });

    // Favorileri getir
    const favorites = await storageService.getFavorites();
    console.log('Favoriler:', favorites);

    // Favorilerden çıkar
    await storageService.removeFromFavorites('12345');

    // İzleme geçmişine ekle
    await storageService.addToHistory({
      id: '12345',
      type: 'movie',
      title: 'Avatar',
      poster: 'https://example.com/poster.jpg',
    });

    // İzleme geçmişini getir
    const history = await storageService.getHistory();
    console.log('İzleme geçmişi:', history);

    // İzlemeye devam et (progress kaydet)
    await storageService.saveContinueWatching({
      id: '12345',
      type: 'movie',
      title: 'Avatar',
      poster: 'https://example.com/poster.jpg',
      progress: 45, // %45 izlendi
      duration: 7200, // 2 saat (saniye)
      currentTime: 3240, // 54 dakika (saniye)
    });

    // İzlemeye devam et listesini getir
    const continueWatching = await storageService.getContinueWatching();
    console.log('İzlemeye devam et:', continueWatching);

    // Ayarları kaydet
    await storageService.saveSettings({
      theme: 'dark',
      language: 'tr',
      autoplay: true,
      quality: '1080p',
    });

    // Ayarları getir
    const settings = await storageService.getSettings();
    console.log('Ayarlar:', settings);
  } catch (error) {
    console.error('Storage hatası:', error);
  }
}

// ============================================
// REACT COMPONENT ÖRNEĞI
// ============================================

/*
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TextInput } from 'react-native';
import { authService, channelService } from '@/services';
import type { Channel } from '@/services';

// 1. LOGIN SCREEN ÖRNEĞI
export function LoginScreen() {
  const [host, setHost] = useState('zunexle.live');
  const [port, setPort] = useState('8080');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const accountInfo = await authService.login({
        host,
        port,
        username,
        password,
        protocol: 'http',
      });

      console.log('Giriş başarılı!', accountInfo.user_info);
      // Navigate to home screen
    } catch (error) {
      console.error('Giriş hatası:', error);
      alert('Giriş başarısız!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Host (örn: zunexle.live)"
        value={host}
        onChangeText={setHost}
      />
      <TextInput
        placeholder="Port (örn: 8080)"
        value={port}
        onChangeText={setPort}
      />
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
}

// 2. CHANNEL LIST ÖRNEĞI
export function ChannelListScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
    loadChannels();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await channelService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
    }
  };

  const loadChannels = async (categoryId?: string) => {
    try {
      setLoading(true);
      const result = await channelService.getChannels(categoryId);
      setChannels(result);
    } catch (error) {
      console.error('Kanallar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    loadChannels(categoryId);
  };

  if (loading) {
    return <Text>Yükleniyor...</Text>;
  }

  return (
    <View>
      <Text>Kategoriler:</Text>
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.category_id}
        renderItem={({ item }) => (
          <Button
            title={item.category_name}
            onPress={() => handleCategoryChange(item.category_id)}
          />
        )}
      />

      <Text>Kanallar ({channels.length}):</Text>
      <FlatList
        data={channels}
        keyExtractor={(item) => item.stream_id.toString()}
        renderItem={({ item }) => (
          <View>
            <Text>{item.name}</Text>
            <Text>Stream URL: {item.streamUrl}</Text>
            <Button
              title="İzle"
              onPress={() => {
                // Video player'a yönlendir
                console.log('Playing:', item.streamUrl);
              }}
            />
          </View>
        )}
      />
    </View>
  );
}
*/
