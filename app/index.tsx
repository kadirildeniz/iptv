import CardComponent from '@/app/components/card-component';
import { useRouter, Redirect } from 'expo-router';
import {
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  Pressable,
  View,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import storageService from '@/services/storage.service';
import { syncService, authService, databaseService } from '@/services';
import { getDeviceType, isTV } from '@/utils/responsive';
import AiAssistantModal from '@/components/AiAssistantModal';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [syncing, setSyncing] = useState({ channels: false, movies: false, series: false });
  const [counts, setCounts] = useState({ channels: 0, movies: 0, series: 0 });

  // Manuel focus state'leri - her eleman için ayrı
  const [liveTvFocused, setLiveTvFocused] = useState(false);
  const [moviesFocused, setMoviesFocused] = useState(false);
  const [seriesFocused, setSeriesFocused] = useState(false);
  const [profileFocused, setProfileFocused] = useState(false);
  const [settingsFocused, setSettingsFocused] = useState(false);
  // Güncelleme butonları için focus state
  const [updateLiveTvFocused, setUpdateLiveTvFocused] = useState(false);
  const [updateMoviesFocused, setUpdateMoviesFocused] = useState(false);
  const [updateSeriesFocused, setUpdateSeriesFocused] = useState(false);

  // Rotate animations
  const rotateAnimChannels = useRef(new Animated.Value(0)).current;
  const rotateAnimMovies = useRef(new Animated.Value(0)).current;
  const rotateAnimSeries = useRef(new Animated.Value(0)).current;

  const deviceType = getDeviceType(width);
  const isPhone = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';

  useEffect(() => {
    checkStoredCredentials();
    loadCounts();
  }, []);

  // Rotation animations
  useEffect(() => {
    if (syncing.channels) {
      Animated.loop(
        Animated.timing(rotateAnimChannels, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnimChannels.setValue(0);
    }
  }, [syncing.channels]);

  useEffect(() => {
    if (syncing.movies) {
      Animated.loop(
        Animated.timing(rotateAnimMovies, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnimMovies.setValue(0);
    }
  }, [syncing.movies]);

  useEffect(() => {
    if (syncing.series) {
      Animated.loop(
        Animated.timing(rotateAnimSeries, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnimSeries.setValue(0);
    }
  }, [syncing.series]);

  const rotationChannels = rotateAnimChannels.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotationMovies = rotateAnimMovies.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotationSeries = rotateAnimSeries.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const loadCounts = async () => {
    const newCounts = await databaseService.getCounts();
    setCounts(newCounts);
  };

  const checkStoredCredentials = async () => {
    try {
      const creds = await storageService.getCredentials();
      if (!creds) {
        setShouldRedirect(true);
      } else {
        await authService.loadCredentials();
      }
    } catch (e) {
      console.error(e);
      setShouldRedirect(true);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSync = async (type: 'channels' | 'movies' | 'series') => {
    setSyncing(prev => ({ ...prev, [type]: true }));
    try {
      if (type === 'channels') {
        await syncService.syncChannelsOnly();
      } else if (type === 'movies') {
        await syncService.syncMoviesOnly();
      } else if (type === 'series') {
        await syncService.syncSeriesOnly();
      }
      await loadCounts();
      Alert.alert('Başarılı', `${type === 'channels' ? 'Kanallar' : type === 'movies' ? 'Filmler' : 'Diziler'} güncellendi.`);
    } catch (error) {
      Alert.alert('Hata', 'Güncelleme sırasında bir hata oluştu.');
      console.error(error);
    } finally {
      setSyncing(prev => ({ ...prev, [type]: false }));
    }
  };

  if (shouldRedirect) return <Redirect href="/login" />;
  if (checkingAuth) {
    return (
      <ImageBackground source={require('@/assets/images/bg-home.png')} style={styles.container} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('@/assets/images/bg-home.png')} style={styles.container} resizeMode="cover">
      <View style={styles.safeArea}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={styles.headerContent}>
            <Image source={require('@/assets/images/splash.png')} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.textDescription}>
              Canlı Tv, Dizi, Film ve yüzlerce içerik…
            </Text>
          </View>

          <View style={styles.iconButtons}>
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
            </View>

            <Pressable
              onFocus={() => setProfileFocused(true)}
              onBlur={() => setProfileFocused(false)}
              onPress={() => router.push('/settings')}
              isTVSelectable={true}
              focusable={true}
              android_tv_focusable={true}
            >
              <View style={[styles.iconButton, { marginRight: 12 }, profileFocused && styles.iconFocused]}>
                <Ionicons name="person-circle-outline" size={28} color="#ffffff" />
              </View>
            </Pressable>
            <Pressable
              onFocus={() => setSettingsFocused(true)}
              onBlur={() => setSettingsFocused(false)}
              onPress={() => router.push('/settings')}
              isTVSelectable={true}
              focusable={true}
              android_tv_focusable={true}
            >
              <View style={[styles.iconButton, settingsFocused && styles.iconFocused]}>
                <Ionicons name="settings-outline" size={28} color="#ffffff" />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.contentView}>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>* İçerikleri güncellemek için kart üzerindeki ikona basınız.</Text>
          </View>

          {/* GÜNCELLEME BUTONLARI SATIRI - D-Pad ile erişilebilir */}
          <View style={[styles.updateButtonsRow, { flexDirection: isPhone ? 'column' : 'row' }]}>
            {/* Canlı TV Güncelleme */}
            <View style={[styles.updateButtonContainer, { width: isPhone ? '100%' : '32%', marginRight: isPhone ? 0 : 12 }]}>
              <Pressable
                onFocus={() => setUpdateLiveTvFocused(true)}
                onBlur={() => setUpdateLiveTvFocused(false)}
                onPressIn={() => setUpdateLiveTvFocused(true)}
                onPressOut={() => setUpdateLiveTvFocused(false)}
                onPress={() => handleSync('channels')}
                disabled={syncing.channels}
                isTVSelectable={true}
                focusable={true}
                android_tv_focusable={true}
              >
                <View style={[styles.updateButton, updateLiveTvFocused && styles.updateButtonFocused]}>
                  <Animated.View style={{ transform: [{ rotate: rotationChannels }] }}>
                    <Ionicons
                      name={syncing.channels ? "refresh" : "refresh-outline"}
                      size={20}
                      color="#fff"
                    />
                  </Animated.View>
                </View>
              </Pressable>
            </View>

            {/* Filmler Güncelleme */}
            <View style={[styles.updateButtonContainer, { width: isPhone ? '100%' : '32%', marginRight: isPhone ? 0 : 12 }]}>
              <Pressable
                onFocus={() => setUpdateMoviesFocused(true)}
                onBlur={() => setUpdateMoviesFocused(false)}
                onPressIn={() => setUpdateMoviesFocused(true)}
                onPressOut={() => setUpdateMoviesFocused(false)}
                onPress={() => handleSync('movies')}
                disabled={syncing.movies}
                isTVSelectable={true}
                focusable={true}
                android_tv_focusable={true}
              >
                <View style={[styles.updateButton, updateMoviesFocused && styles.updateButtonFocused]}>
                  <Animated.View style={{ transform: [{ rotate: rotationMovies }] }}>
                    <Ionicons
                      name={syncing.movies ? "refresh" : "refresh-outline"}
                      size={20}
                      color="#fff"
                    />
                  </Animated.View>
                </View>
              </Pressable>
            </View>

            {/* Diziler Güncelleme */}
            <View style={[styles.updateButtonContainer, { width: isPhone ? '100%' : '32%' }]}>
              <Pressable
                onFocus={() => setUpdateSeriesFocused(true)}
                onBlur={() => setUpdateSeriesFocused(false)}
                onPressIn={() => setUpdateSeriesFocused(true)}
                onPressOut={() => setUpdateSeriesFocused(false)}
                onPress={() => handleSync('series')}
                disabled={syncing.series}
                isTVSelectable={true}
                focusable={true}
                android_tv_focusable={true}
              >
                <View style={[styles.updateButton, updateSeriesFocused && styles.updateButtonFocused]}>
                  <Animated.View style={{ transform: [{ rotate: rotationSeries }] }}>
                    <Ionicons
                      name={syncing.series ? "refresh" : "refresh-outline"}
                      size={20}
                      color="#fff"
                    />
                  </Animated.View>
                </View>
              </Pressable>
            </View>
          </View>

          {/* KARTLAR SATIRI */}
          <View style={[styles.cardContainer, { flexDirection: isPhone ? 'column' : 'row' }]}>
            {/* CANLI TV KARTI */}
            <View style={[styles.cardWrapper, { width: isPhone ? '100%' : '32%', marginRight: isPhone ? 0 : 12, marginBottom: isPhone ? 12 : 0 }]}>
              <Pressable
                onFocus={() => setLiveTvFocused(true)}
                onBlur={() => setLiveTvFocused(false)}
                onPress={() => router.push('/live-tv')}
                isTVSelectable={true}
                focusable={true}
                android_tv_focusable={true}
                hasTVPreferredFocus={true}
              >
                <View style={[styles.cardTouchable, liveTvFocused && styles.cardFocused]}>
                  <CardComponent
                    title="Canlı TV"
                    description={`${counts.channels} Kanal`}
                    image={require('@/assets/images/tv.png')}
                    style={styles.card}
                  />
                </View>
              </Pressable>
            </View>

            {/* FİLMLER KARTI */}
            <View style={[styles.cardWrapper, { width: isPhone ? '100%' : '32%', marginRight: isPhone ? 0 : 12, marginBottom: isPhone ? 12 : 0 }]}>
              <Pressable
                onFocus={() => setMoviesFocused(true)}
                onBlur={() => setMoviesFocused(false)}
                onPress={() => router.push('/movies')}
                isTVSelectable={true}
                focusable={true}
                android_tv_focusable={true}
              >
                <View style={[styles.cardTouchable, moviesFocused && styles.cardFocused]}>
                  <CardComponent
                    title="Filmler"
                    description={`${counts.movies} Film`}
                    image={require('@/assets/images/film-rulo.png')}
                    style={styles.card}
                  />
                </View>
              </Pressable>
            </View>

            {/* DİZİLER KARTI */}
            <View style={[styles.cardWrapper, { width: isPhone ? '100%' : '32%' }]}>
              <Pressable
                onFocus={() => setSeriesFocused(true)}
                onBlur={() => setSeriesFocused(false)}
                onPress={() => router.push('/series')}
                isTVSelectable={true}
                focusable={true}
                android_tv_focusable={true}
              >
                <View style={[styles.cardTouchable, seriesFocused && styles.cardFocused]}>
                  <CardComponent
                    title="Diziler"
                    description={`${counts.series} Dizi`}
                    image={require('@/assets/images/tv-start.png')}
                    style={styles.card}
                  />
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      <AiAssistantModal />
    </ImageBackground>
  );
}

/* ==================== STYLES ==================== */
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 20,
    paddingBottom: 12,
  },
  headerContent: { flex: 1 },
  headerLogo: { width: 150, height: 40, alignSelf: 'flex-start' },
  textDescription: { color: '#fff', fontSize: 14, opacity: 0.85, marginTop: 6 },
  iconButtons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  focusedIcon: {
    borderColor: '#00E5FF',
    borderWidth: 0,
  },
  dateContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginRight: 16,
  },
  dateText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  contentView: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
  infoContainer: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  infoText: { color: '#fff', opacity: 0.85, fontSize: 13 },
  // Güncelleme butonları satırı
  updateButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -35, // Kartlarla overlap için negatif margin
    zIndex: 10,
    paddingHorizontal: 4,
  },
  updateButtonContainer: {
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  updateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  updateButtonFocused: {
    borderColor: '#00E5FF',
    borderWidth: 2,
    transform: [{ scale: 1.2 }],
    backgroundColor: 'rgba(99, 102, 241, 1)',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.6,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  cardContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardWrapper: {
    marginBottom: 16,
  },
  cardTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  card: { width: '100%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  // TV FOCUS STİLLERİ
  cardFocused: {
    borderColor: '#00E5FF',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  iconFocused: {
    borderColor: '#00E5FF',
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
});