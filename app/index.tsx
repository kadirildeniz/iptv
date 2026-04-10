import CardComponent from '@/app/components/card-component';
import { useRouter, Redirect, useFocusEffect } from 'expo-router';
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
  ScrollView,
  Dimensions,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import storageService from '@/services/storage.service';
import { syncService, authService, databaseService } from '@/services';
import { getDeviceType, isTV } from '@/utils/responsive';
import AiAssistantModal from '@/components/AiAssistantModal';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [syncing, setSyncing] = useState({ channels: false, movies: false, series: false });
  const [counts, setCounts] = useState({ channels: 0, movies: 0, series: 0 });

  // Manuel focus state'leri - her eleman için ayrı
  const [liveTvFocused, setLiveTvFocused] = useState(false);
  const [moviesFocused, setMoviesFocused] = useState(false);
  const [seriesFocused, setSeriesFocused] = useState(false);
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
    // edgeToEdgeEnabled kaldırılınca float/map sorunu çözüldü mü kontrol
    console.log('🔍 [EdgeToEdge Debug] Style prop kontrol:', {
      width,
      height,
      typeOfWidth: typeof width,
      typeOfHeight: typeof height,
      isWidthNumber: typeof width === 'number',
      isHeightNumber: typeof height === 'number',
      platform: Platform.OS,
      isTV: Platform.isTV,
    });
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

  // Geri Tuşu (BackHandler) için onayı
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          t('common.exitAppTitle', 'Çıkış'),
          t('common.exitAppMessage', 'Uygulamadan çıkmak istiyor musunuz?'),
          [
            {
              text: t('common.no', 'Hayır'),
              onPress: () => null,
              style: 'cancel',
            },
            {
              text: t('common.yes', 'Evet'),
              onPress: () => BackHandler.exitApp(),
            },
          ],
          { cancelable: true }
        );
        // Geri tuşunun varsayılan hareketini (hemen çıkma) engelle
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove();
      };
    }, [t])
  );

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
      Alert.alert(t('common.success'), t('home.syncSuccess', { type: type === 'channels' ? t('home.channelsLabel') : type === 'movies' ? t('home.moviesLabel') : t('home.seriesLabel') }));
    } catch (error) {
      Alert.alert(t('common.error'), t('home.syncError'));
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
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['bottom']}>
      <ImageBackground source={require('@/assets/images/bg-home.png')} style={styles.container} resizeMode="cover">
        <View style={styles.safeArea}>
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <View style={styles.headerContent}>
              <Image source={require('@/assets/images/splashscreen_logo.png')} style={styles.headerLogo} resizeMode="contain" />
              <Text style={styles.textDescription}>
                {t('home.description')}
              </Text>
            </View>

            <View style={styles.iconButtons}>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </Text>
              </View>


              <Pressable
                onFocus={isTV ? () => setSettingsFocused(true) : undefined}
                onBlur={isTV ? () => setSettingsFocused(false) : undefined}
                onPress={() => router.push('/settings')}
                isTVSelectable={isTV}
                focusable={isTV}
                android_tv_focusable={isTV}
              >
                <View style={[styles.iconButton, isTV && settingsFocused && styles.iconFocused]}>
                  <Ionicons name="settings-outline" size={28} color="#ffffff" />
                </View>
              </Pressable>
            </View>
          </View>

          <View style={[styles.contentView, { justifyContent: isPhone ? 'flex-start' : 'flex-end' }]}>
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>{t('home.updateInfo')}</Text>
            </View>

            {/* GÜNCELLEME BUTONLARI SATIRI - D-Pad ile erişilebilir */}
            <View style={[
              styles.updateButtonsRow,
              {
                flexDirection: isPhone ? 'column' : 'row',
                marginBottom: isPhone ? -10 : -20
              }
            ]}>
              {/* Canlı TV Güncelleme */}
              <View style={[styles.updateButtonContainer, { width: isPhone ? '100%' : '32%', marginRight: isPhone ? 0 : 12 }]}>
                <Pressable
                  onFocus={isTV ? () => setUpdateLiveTvFocused(true) : undefined}
                  onBlur={isTV ? () => setUpdateLiveTvFocused(false) : undefined}
                  onPressIn={isTV ? () => setUpdateLiveTvFocused(true) : undefined}
                  onPressOut={isTV ? () => setUpdateLiveTvFocused(false) : undefined}
                  onPress={() => handleSync('channels')}
                  disabled={syncing.channels}
                  isTVSelectable={isTV}
                  focusable={isTV}
                  android_tv_focusable={isTV}
                >
                  <View style={[styles.updateButton, isTV && updateLiveTvFocused && styles.updateButtonFocused]}>
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
                  onFocus={isTV ? () => setUpdateMoviesFocused(true) : undefined}
                  onBlur={isTV ? () => setUpdateMoviesFocused(false) : undefined}
                  onPressIn={isTV ? () => setUpdateMoviesFocused(true) : undefined}
                  onPressOut={isTV ? () => setUpdateMoviesFocused(false) : undefined}
                  onPress={() => handleSync('movies')}
                  disabled={syncing.movies}
                  isTVSelectable={isTV}
                  focusable={isTV}
                  android_tv_focusable={isTV}
                >
                  <View style={[styles.updateButton, isTV && updateMoviesFocused && styles.updateButtonFocused]}>
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
                  onFocus={isTV ? () => setUpdateSeriesFocused(true) : undefined}
                  onBlur={isTV ? () => setUpdateSeriesFocused(false) : undefined}
                  onPressIn={isTV ? () => setUpdateSeriesFocused(true) : undefined}
                  onPressOut={isTV ? () => setUpdateSeriesFocused(false) : undefined}
                  onPress={() => handleSync('series')}
                  disabled={syncing.series}
                  isTVSelectable={isTV}
                  focusable={isTV}
                  android_tv_focusable={isTV}
                >
                  <View style={[styles.updateButton, isTV && updateSeriesFocused && styles.updateButtonFocused]}>
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
            <View style={[
              styles.cardContainer,
              {
                flexDirection: isPhone ? 'column' : 'row',
                justifyContent: isPhone ? 'flex-start' : 'space-between',
              }
            ]}>
              {/* CANLI TV KARTI */}
              <View style={[styles.cardWrapper, { width: isPhone ? '100%' : '32%', marginRight: isPhone ? 0 : '1%', marginBottom: isPhone ? 8 : 0 }]}>
                <Pressable
                  style={{ flex: 1 }}
                  onFocus={isTV ? () => setLiveTvFocused(true) : undefined}
                  onBlur={isTV ? () => setLiveTvFocused(false) : undefined}
                  onPress={() => router.push('/live-tv')}
                  isTVSelectable={isTV}
                  focusable={isTV}
                  android_tv_focusable={isTV}
                  hasTVPreferredFocus={isTV}
                >
                  <View style={[styles.cardTouchable, isTV && liveTvFocused && styles.cardFocused]}>
                    <CardComponent
                      title={t('home.liveTV')}
                      description={`${counts.channels} ${t('home.channels')}`}
                      image={require('@/assets/images/tv.png')}
                      style={styles.card}
                    />
                  </View>
                </Pressable>
              </View>

              {/* FİLMLER KARTI */}
              <View style={[styles.cardWrapper, { width: isPhone ? '100%' : '32%', marginRight: isPhone ? 0 : '1%', marginBottom: isPhone ? 8 : 0 }]}>
                <Pressable
                  style={{ flex: 1 }}
                  onFocus={isTV ? () => setMoviesFocused(true) : undefined}
                  onBlur={isTV ? () => setMoviesFocused(false) : undefined}
                  onPress={() => router.push('/movies')}
                  isTVSelectable={isTV}
                  focusable={isTV}
                  android_tv_focusable={isTV}
                >
                  <View style={[styles.cardTouchable, isTV && moviesFocused && styles.cardFocused]}>
                    <CardComponent
                      title={t('home.movies')}
                      description={`${counts.movies} ${t('home.movie')}`}
                      image={require('@/assets/images/film-rulo.png')}
                      style={styles.card}
                    />
                  </View>
                </Pressable>
              </View>

              {/* DİZİLER KARTI */}
              <View style={[styles.cardWrapper, { width: isPhone ? '100%' : '32%' }]}>
                <Pressable
                  style={{ flex: 1 }}
                  onFocus={isTV ? () => setSeriesFocused(true) : undefined}
                  onBlur={isTV ? () => setSeriesFocused(false) : undefined}
                  onPress={() => router.push('/series')}
                  isTVSelectable={isTV}
                  focusable={isTV}
                  android_tv_focusable={isTV}
                >
                  <View style={[styles.cardTouchable, isTV && seriesFocused && styles.cardFocused]}>
                    <CardComponent
                      title={t('home.series')}
                      description={`${counts.series} ${t('home.serie')}`}
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
    </SafeAreaView>
  );
}

/* ==================== STYLES ==================== */
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeAreaContainer: { flex: 1, backgroundColor: 'transparent' },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16, // Tüm içerikle tutarlı sol-sağ boşluk
    paddingTop: Platform.OS === 'android' ? 16 : 20,
    paddingBottom: 12,
  },
  headerContent: { flex: 1 },
  headerLogo: { width: 150, height: 40, alignSelf: 'flex-start', marginLeft: -50 },
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
  contentView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  infoContainer: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  infoText: { color: '#fff', opacity: 0.85, fontSize: 12 },
  // Güncelleme butonları satırı
  updateButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -20, // Kartlarla overlap için negatif margin (azaltıldı)
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
  cardContainer: { flexDirection: 'row', justifyContent: 'space-between', flex: 1 },
  cardWrapper: {
    marginBottom: 4,
    flex: 1,
  },
  cardTouchable: {
    borderRadius: 16,
    overflow: 'visible',
    borderWidth: 2,
    borderColor: 'transparent',
    flex: 1,
  },
  card: { width: '100%', flex: 1 },
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