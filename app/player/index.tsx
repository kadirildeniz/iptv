import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
  Alert,
  Linking,
  ScrollView,
  Platform,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import Video, {
  VideoRef,
  OnLoadData,
  OnProgressData,
  OnBufferData,
} from 'react-native-video';
import Slider from '@react-native-community/slider';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Brightness from 'expo-brightness';
import { useTranslation } from 'react-i18next';

import { storageService, databaseService } from '@/services';
import { fonts } from '@/theme/fonts';
import { AudioBooster } from '@/utils/AudioBooster';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ResizeMode = 'contain' | 'cover' | 'stretch';

interface Track {
  index: number;
  title: string;
  language: string;
  selected: boolean;
}

interface OnErrorData {
  error: {
    localizedDescription?: string;
  };
}

const PlayerScreen: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const videoRef = useRef<VideoRef>(null);

  // URL ve Title
  const streamUrl = Array.isArray(params.url) ? params.url[0] : params.url || '';
  const title = Array.isArray(params.title) ? params.title[0] : params.title || 'Video';
  const itemId = Array.isArray(params.id) ? params.id[0] : params.id || streamUrl;
  const itemType = Array.isArray(params.type) ? params.type[0] : params.type || 'movie';
  const poster = Array.isArray(params.poster) ? params.poster[0] : params.poster || '';

  // Player State
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [retryKey, setRetryKey] = useState(0); // Video bileşenini yeniden mount etmek için
  const retryCount = useRef(0); // Otomatik yeniden deneme sayacı
  const [resumeChecked, setResumeChecked] = useState(false);

  // Gesture State
  const [brightness, setBrightness] = useState(0.5);
  const [gestureType, setGestureType] = useState<'volume' | 'brightness' | 'seek' | null>(null);
  const [seekDirection, setSeekDirection] = useState<'forward' | 'backward' | null>(null);
  const gestureTimeout = useRef<NodeJS.Timeout | null>(null);

  // Progress save timer
  const progressSaveInterval = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTime = useRef<number>(0);

  // UI State
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tracksVisible, setTracksVisible] = useState(false);

  // Settings State
  const [resizeMode, setResizeMode] = useState<ResizeMode>('contain');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [audioBoostLevel, setAudioBoostLevel] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [audioSessionId, setAudioSessionId] = useState<number | null>(null);
  const [hwDecoder, setHwDecoder] = useState(true);
  const [bufferConfig, setBufferConfig] = useState<any>({
    minBufferMs: 15000,
    maxBufferMs: 50000,
    bufferForPlaybackMs: 2500,
    bufferForPlaybackAfterRebufferMs: 5000,
  });

  // TV Focus States
  const [backFocused, setBackFocused] = useState(false);
  const [tracksFocused, setTracksFocused] = useState(false);
  const [settingsFocused, setSettingsFocused] = useState(false);
  const [skipBackFocused, setSkipBackFocused] = useState(false);
  const [playFocused, setPlayFocused] = useState(false);
  const [skipForwardFocused, setSkipForwardFocused] = useState(false);
  const [sliderFocused, setSliderFocused] = useState(false);
  const [dialogEnhancement, setDialogEnhancement] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<string>('off');

  // Tracks
  const [audioTracks, setAudioTracks] = useState<Track[]>([]);
  const [textTracks, setTextTracks] = useState<Track[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(0);
  const [selectedTextTrack, setSelectedTextTrack] = useState<number>(-1);
  const autoTrackSelected = useRef<boolean>(false);

  // Hide controls timer
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initialize();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
      saveProgress();
      AudioBooster.release();
    };
  }, []);

  // 🌐 Akıllı Ses Kanalı Seçimi (Auto-select based on preference)
  useEffect(() => {
    if (audioTracks.length > 1 && preferredLanguage !== 'off' && !autoTrackSelected.current) {
      // Dil kodu eşleştirme haritası
      const LANGUAGE_MAP: Record<string, string[]> = {
        'tur': ['tur', 'tr', 'turkish', 'türkçe', 'turkce', 'tr-tr'],
        'eng': ['eng', 'en', 'english', 'inglés', 'en-us', 'en-gb'],
        'ger': ['ger', 'de', 'deu', 'german', 'deutsch', 'de-de'],
        'fra': ['fra', 'fr', 'fre', 'french', 'français', 'fr-fr'],
        'spa': ['spa', 'es', 'spanish', 'español', 'castilian', 'es-es'],
        'ara': ['ara', 'ar', 'arabic', 'العربية'],
        'rus': ['rus', 'ru', 'russian', 'русский', 'ru-ru'],
        'original': ['original', 'orig', 'default', 'und'],
      };

      const targetVariants = LANGUAGE_MAP[preferredLanguage] || [];

      // Dil eşleşmesi ara
      const matchedIndex = audioTracks.findIndex(t => {
        const lang = (t.language || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        return targetVariants.some(v => lang.includes(v) || title.includes(v));
      });

      if (matchedIndex !== -1) {
        console.log(`🌐 Otomatik Dil Seçimi: ${audioTracks[matchedIndex].title} (${audioTracks[matchedIndex].language})`);
        setSelectedAudioTrack(matchedIndex);
        autoTrackSelected.current = true;
      }
    }
  }, [audioTracks, preferredLanguage]);

  // Audio Boost Effect - audioSessionId olmasa bile global (0) session ile çalışır
  useEffect(() => {
    const sessionId = audioSessionId ?? 0; // null ise 0 (global) kullan
    console.log(`🎧 Audio Boost Effect: sessionId=${sessionId}, level=${audioBoostLevel}`);
    AudioBooster.setBoost(sessionId, audioBoostLevel);
  }, [audioSessionId, audioBoostLevel]);

  // Auto-hide controls effect - kontroller görünürken ve video oynuyorken 4 saniye sonra gizle
  useEffect(() => {
    if (controlsVisible && !paused && !loading) {
      const timer = setTimeout(() => {
        setControlsVisible(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [controlsVisible, paused, loading]);

  const initialize = async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

      // Brightness izni - Android TV'de desteklenmiyor, hata verirse atla
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === 'granted') {
          const currentBrightness = await Brightness.getBrightnessAsync();
          setBrightness(currentBrightness);
        }
      } catch (brightnessError) {
        console.log('Brightness API not supported (probably Android TV):', brightnessError);
        // Android TV'de parlaklık API'si çalışmıyor, devam et
      }

      const savedResizeMode = await storageService.getItem<string>('default_resize_mode');
      if (savedResizeMode) setResizeMode(savedResizeMode as ResizeMode);

      // Ses Ayarlarını Yükle
      const audioSettings = await storageService.getAudioSettings();
      setAudioBoostLevel(audioSettings.boostLevel);
      setDialogEnhancement(audioSettings.dialogueEnhance);
      setPreferredLanguage(audioSettings.preferredLanguage);

      // Ses seviyesini ayarla (Boost varsa artır)
      // Android'de volume 1.0 üzeri çalışmayabilir ama yine de set ediyoruz
      // Eğer boostLevel > 1.0 ise, volume'u da ona eşitliyoruz
      setVolume(audioSettings.boostLevel);

      if (audioSettings.boostLevel > 1.0 && Platform.OS === 'android') {
        // Kullanıcıya ilk seferde bilgi verilebilir (Opsiyonel)
        // ToastAndroid.show('Ses güçlendirme aktif', ToastAndroid.SHORT);
      }

      // Player Ayarlarını Yükle
      const playerSettings = await storageService.getPlayerSettings();
      setHwDecoder(playerSettings.hwDecoder);

      // Buffer Config Ayarla
      let newBufferConfig = {
        minBufferMs: 15000,
        maxBufferMs: 50000,
        bufferForPlaybackMs: 2500,
        bufferForPlaybackAfterRebufferMs: 5000,
      };

      if (playerSettings.bufferMode === 'low') {
        newBufferConfig = {
          minBufferMs: 5000,
          maxBufferMs: 15000,
          bufferForPlaybackMs: 1000,
          bufferForPlaybackAfterRebufferMs: 2500,
        };
      } else if (playerSettings.bufferMode === 'high') {
        newBufferConfig = {
          minBufferMs: 30000,
          maxBufferMs: 60000,
          bufferForPlaybackMs: 5000,
          bufferForPlaybackAfterRebufferMs: 10000,
        };
      }
      setBufferConfig(newBufferConfig);

      await checkResumePoint();
    } catch (error) {
      console.error('Initialize error:', error);
    }
  };

  const checkResumePoint = async () => {
    try {
      const continueWatching = await databaseService.getContinueWatchingItem(itemId);

      if (continueWatching && continueWatching.currentTime > 0 && continueWatching.progress < 95) {
        const minutes = Math.floor(continueWatching.currentTime / 60);
        const seconds = Math.floor(continueWatching.currentTime % 60);

        Alert.alert(
          t('player.resumeTitle'),
          t('player.resumeMessage', { time: `${minutes}:${seconds.toString().padStart(2, '0')}` }),
          [
            {
              text: t('player.resumeStartOver'),
              onPress: () => setResumeChecked(true),
              style: 'cancel',
            },
            {
              text: t('player.resumeContinue'),
              onPress: () => {
                setCurrentTime(continueWatching.currentTime);
                videoRef.current?.seek(continueWatching.currentTime);
                setResumeChecked(true);
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        setResumeChecked(true);
      }
    } catch (error) {
      console.error('Check resume point error:', error);
      setResumeChecked(true);
    }
  };

  const saveProgress = async () => {
    if (duration === 0 || currentTime === 0) return;

    const progress = (currentTime / duration) * 100;

    if (progress >= 95) {
      await databaseService.removeContinueWatching(itemId);
      return;
    }

    try {
      await databaseService.saveContinueWatching({
        id: itemId,
        type: itemType as 'movie' | 'series' | 'channel',
        title: title,
        poster: poster,
        cover: poster,
        progress: progress,
        currentTime: currentTime,
        duration: duration,
      });
      lastSavedTime.current = currentTime;
    } catch (error) {
      console.error('Save progress error:', error);
    }
  };

  const showControlsTemporarily = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      // ref kullanarak güncel paused değerini kontrol et
      if (!pausedRef.current) {
        setControlsVisible(false);
      }
    }, 4000);
  };

  const handleScreenPress = () => {
    if (controlsVisible) {
      setControlsVisible(false);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    } else {
      showControlsTemporarily();
    }
  };

  const handlePlayPause = () => {
    if (!paused) saveProgress();
    const newPaused = !paused;
    setPaused(newPaused);
    pausedRef.current = newPaused;
    showControlsTemporarily();
  };

  const handleSeek = (time: number) => {
    videoRef.current?.seek(time);
    setCurrentTime(time);
  };

  const handleSeekStart = () => setSeeking(true);

  const handleSeekEnd = (value: number) => {
    setSeeking(false);
    handleSeek(value);
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    handleSeek(newTime);
    showControlsTemporarily();
  };

  // Gesture Logic
  const handleGestureEnd = () => {
    if (gestureTimeout.current) clearTimeout(gestureTimeout.current);
    gestureTimeout.current = setTimeout(() => {
      setGestureType(null);
      setSeekDirection(null);
    }, 1000);
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart((event) => {
      const isRight = event.x > SCREEN_WIDTH / 2;
      runOnJS(handleSkip)(isRight ? 10 : -10);
      runOnJS(setGestureType)('seek');
      runOnJS(setSeekDirection)(isRight ? 'forward' : 'backward');
      runOnJS(handleGestureEnd)();
    });

  const singleTap = Gesture.Tap()
    .onStart(() => {
      runOnJS(handleScreenPress)();
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      const isRight = event.x > SCREEN_WIDTH / 2;
      const delta = -event.velocityY / 10000;

      if (isRight) {
        runOnJS(setVolume)((prev) => Math.max(0, Math.min(1, prev + delta)));
        runOnJS(setGestureType)('volume');
      } else {
        runOnJS(setBrightness)((prev) => {
          const newVal = Math.max(0, Math.min(1, prev + delta));
          // Android TV'de desteklenmiyor, hata verirse sessizce atla
          try {
            Brightness.setSystemBrightnessAsync(newVal);
          } catch (e) {
            // Ignore brightness errors on Android TV
          }
          return newVal;
        });
        runOnJS(setGestureType)('brightness');
      }
      runOnJS(handleGestureEnd)();
    });

  const composedGestures = Gesture.Race(doubleTap, Gesture.Simultaneous(singleTap, pan));

  const handleLoad = (data: OnLoadData) => {
    setLoading(false);
    setDuration(data.duration);
    setError(null);

    if (data.audioTracks?.length > 0) {
      const tracks = data.audioTracks.map((track: any, index: number) => ({
        index,
        title: track.title || `Audio ${index + 1}`,
        language: track.language || 'unknown',
        selected: index === 0,
      }));
      setAudioTracks(tracks);
      autoTrackSelected.current = false;
    }

    if (data.textTracks?.length > 0) {
      setTextTracks(data.textTracks.map((track: any, index: number) => ({
        index,
        title: track.title || `Subtitle ${index + 1}`,
        language: track.language || 'unknown',
        selected: false,
      })));
    }
  };

  const handleProgress = (data: OnProgressData) => {
    if (!seeking) setCurrentTime(data.currentTime);
  };

  const handleBuffer = (data: OnBufferData) => setBuffering(data.isBuffering);

  const handleError = (errorData: any) => {
    const errorStr = JSON.stringify(errorData);
    console.error('❌ Video error:', errorStr);
    console.error('🔗 Stream URL:', streamUrl); // URL'yi tam logla

    // HTTP hata kodlarını kontrol et (403, 404, 401 vb.)
    const errorStackTrace = errorData?.error?.errorStackTrace || '';
    const errorString = errorData?.error?.errorString || '';
    const httpCodeMatch = errorStackTrace.match(/Response code: (\d+)/);
    const httpCode = httpCodeMatch ? parseInt(httpCodeMatch[1]) : null;

    // HTTP hatası varsa retry yapmak anlamsız - direkt kullanıcıya göster
    if (httpCode) {
      setLoading(false);
      console.error(`🚫 HTTP ${httpCode} hatası - yeniden deneme yapılmıyor`);
      
      const httpMessages: Record<number, string> = {
        401: '🔑 Yetkilendirme hatası.\n\nKullanıcı adı veya şifre yanlış olabilir.\nLütfen çıkış yapıp tekrar giriş yapın.',
        403: '🚫 Erişim engellendi (403 Forbidden).\n\nOlası nedenler:\n• Abonelik süresi dolmuş olabilir\n• Başka bir cihazda aktif oturum olabilir\n• IPTV sağlayıcınız bu içeriğe erişimi engellemiş olabilir\n• IP adresiniz değişmiş olabilir',
        404: '🔍 İçerik bulunamadı (404).\n\nBu video sunucuda mevcut değil.\nİçerik kaldırılmış olabilir.',
        500: '⚠️ Sunucu hatası (500).\n\nIPTV sunucusunda bir sorun var.\nDaha sonra tekrar deneyin.',
        502: '⚠️ Sunucu yanıt vermiyor (502).\n\nIPTV sunucusu şu anda erişilemez.',
        503: '⚠️ Sunucu bakımda (503).\n\nDaha sonra tekrar deneyin.',
      };

      const userMsg = httpMessages[httpCode] || `⚠️ Sunucu hatası (HTTP ${httpCode}).\n\nLütfen daha sonra tekrar deneyin.`;
      setError(`${userMsg}\n\nURL: ${streamUrl.substring(0, 80)}...`);
      return;
    }

    // HTTP hatası değilse (codec/network sorunu olabilir) - fallback dene
    // İlk hatada otomatik olarak SW decoder ile tekrar dene
    if (retryCount.current === 0 && hwDecoder) {
      retryCount.current++;
      console.log('🔄 HW decoder başarısız, SW decoder ile yeniden deneniyor...');
      setHwDecoder(false);
      setRetryKey(prev => prev + 1);
      return;
    }
    
    // İkinci denemede farklı buffer ayarları ile dene
    if (retryCount.current === 1) {
      retryCount.current++;
      console.log('🔄 Buffer ayarları değiştirilerek yeniden deneniyor...');
      setBufferConfig({
        minBufferMs: 30000,
        maxBufferMs: 120000,
        bufferForPlaybackMs: 5000,
        bufferForPlaybackAfterRebufferMs: 10000,
      });
      setRetryKey(prev => prev + 1);
      return;
    }
    
    setLoading(false);
    const errorMsg = errorData?.error?.localizedDescription 
      || errorData?.error?.cause?.message 
      || errorData?.error?.errorException
      || t('player.errorTitle');
    const errorCode = errorData?.error?.errorCode || t('common.unknown');
    setError(`${errorMsg}\n\nHata Kodu: ${errorCode}\nURL: ${streamUrl.substring(0, 80)}...`);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    retryCount.current = 0;
    setHwDecoder(true); // HW decoder'ı resetle
    setRetryKey(prev => prev + 1); // Video bileşenini yeniden mount et
  };

  const handleBack = async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    router.back();
  };

  const handleOpenInVLC = async () => {
    try {
      const vlcUrl = `vlc://${streamUrl}`;
      if (await Linking.canOpenURL(vlcUrl)) {
        await Linking.openURL(vlcUrl);
      } else {
        Alert.alert(t('common.error'), t('player.vlcNotInstalled'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('player.vlcOpenError'));
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar hidden />
        <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
        <Text style={styles.errorTitle}>{t('player.errorTitle')}</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity style={styles.errorButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.errorButtonText}>{t('player.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.errorButton, styles.errorButtonSecondary]} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.errorButtonText}>{t('player.goBack')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalItem} onPress={handleOpenInVLC}>
            <Ionicons name="open-outline" size={24} color="#3b82f6" />
            <Text style={[styles.modalItemLabel, { color: '#3b82f6', marginLeft: 12 }]}>{t('player.openInVLC')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={composedGestures}>
          <View style={styles.videoContainer}>
            <Video
              key={`video-player-${retryKey}`}
              ref={videoRef}
              source={{
                uri: streamUrl,
                headers: {
                  'User-Agent': 'ExoPlayer/2.x (Linux; Android)',
                },
                // Stream türüne göre MIME type belirle
                ...(streamUrl.includes('.m3u8') ? { type: 'application/x-mpegURL' } : {}),
                ...(streamUrl.includes('.ts') && !streamUrl.includes('.tsx') ? { type: 'video/mp2t' } : {}),
              }}
              style={styles.video}
              paused={paused}
              resizeMode={resizeMode}
              volume={volume}
              rate={playbackRate}
              playInBackground={true}
              playWhenInactive={false}
              useTextureView={!hwDecoder} // HW Decoder ayarı (false = SurfaceView = Daha iyi performans)
              bufferConfig={bufferConfig} // Dinamik buffer ayarı
              onLoad={handleLoad}
              onProgress={handleProgress}
              onBuffer={handleBuffer}
              onError={handleError}
              // @ts-ignore
              onAudioSessionId={(data: any) => {
                setAudioSessionId((prevId) => prevId !== data.audioSessionId ? data.audioSessionId : prevId);
              }}
              audioOutput="speaker"
              selectedAudioTrack={{
                type: "index",
                value: selectedAudioTrack
              } as any}
              selectedTextTrack={{
                type: selectedTextTrack === -1 ? "disabled" : "index",
                value: selectedTextTrack === -1 ? undefined : selectedTextTrack
              } as any}
            />

            {/* Gesture Feedback */}
            {gestureType === 'volume' && (
              <View style={styles.gestureFeedback}>
                <Ionicons
                  name={volume === 0 ? "volume-mute" : volume < 0.5 ? "volume-low" : "volume-high"}
                  size={40} color="#fff"
                />
                <Text style={styles.gestureText}>{Math.round(volume * 100)}%</Text>
              </View>
            )}

            {gestureType === 'brightness' && (
              <View style={styles.gestureFeedback}>
                <Ionicons name="sunny" size={40} color="#fff" />
                <Text style={styles.gestureText}>{Math.round(brightness * 100)}%</Text>
              </View>
            )}

            {gestureType === 'seek' && (
              <View style={styles.gestureFeedback}>
                <Ionicons
                  name={seekDirection === 'forward' ? "play-forward" : "play-back"}
                  size={40} color="#fff"
                />
                <Text style={styles.gestureText}>
                  {seekDirection === 'forward' ? '+10s' : '-10s'}
                </Text>
              </View>
            )}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Loading Indicator */}
      {(loading || buffering) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>
            {loading ? 'Yükleniyor...' : 'Arabelleğe alınıyor...'}
          </Text>
        </View>
      )}

      {/* TV Remote Focus Layer - Kontroller gizliyken bile D-pad ile erişilebilir */}
      {Platform.isTV && !controlsVisible && !loading && (
        <Pressable
          style={styles.tvFocusLayer}
          onPress={() => {
            showControlsTemporarily();
          }}
          isTVSelectable={true}
          focusable={true}
          hasTVPreferredFocus={true}
        />
      )}

      {/* Controls Overlay */}
      {controlsVisible && (
        <View style={styles.controlsOverlay}>
          <View style={styles.topBar}>
            <Pressable
              isTVSelectable={true}
              focusable={true}
              android_tv_focusable={true}
              hasTVPreferredFocus={true}
              onFocus={() => setBackFocused(true)}
              onBlur={() => setBackFocused(false)}
              style={[
                styles.topButton,
                backFocused && styles.buttonFocused
              ]}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </Pressable>
            <Text style={styles.videoTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.topRight}>
              <Pressable
                isTVSelectable={true}
                focusable={true}
                android_tv_focusable={true}
                onFocus={() => setTracksFocused(true)}
                onBlur={() => setTracksFocused(false)}
                style={[
                  styles.topButton,
                  tracksFocused && styles.buttonFocused
                ]}
                onPress={() => setTracksVisible(true)}
              >
                <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
              </Pressable>
              <Pressable
                isTVSelectable={true}
                focusable={true}
                android_tv_focusable={true}
                onFocus={() => setSettingsFocused(true)}
                onBlur={() => setSettingsFocused(false)}
                style={[
                  styles.topButton,
                  settingsFocused && styles.buttonFocused
                ]}
                onPress={() => setSettingsVisible(true)}
              >
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={styles.centerControls}>
            <Pressable
              isTVSelectable={true}
              focusable={true}
              android_tv_focusable={true}
              onFocus={() => setSkipBackFocused(true)}
              onBlur={() => setSkipBackFocused(false)}
              style={[
                styles.controlButton,
                skipBackFocused && styles.buttonFocused
              ]}
              onPress={() => handleSkip(-10)}
            >
              <Ionicons name="play-back" size={40} color="#fff" />
            </Pressable>
            <Pressable
              isTVSelectable={true}
              focusable={true}
              android_tv_focusable={true}
              onFocus={() => setPlayFocused(true)}
              onBlur={() => setPlayFocused(false)}
              style={[
                styles.playButton,
                playFocused && styles.buttonFocused
              ]}
              onPress={handlePlayPause}
            >
              <Ionicons name={paused ? 'play' : 'pause'} size={60} color="#fff" />
            </Pressable>
            <Pressable
              isTVSelectable={true}
              focusable={true}
              android_tv_focusable={true}
              onFocus={() => setSkipForwardFocused(true)}
              onBlur={() => setSkipForwardFocused(false)}
              style={[
                styles.controlButton,
                skipForwardFocused && styles.buttonFocused
              ]}
              onPress={() => handleSkip(10)}
            >
              <Ionicons name="play-forward" size={40} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeSeparator}>/</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
            <Pressable
              isTVSelectable={true}
              focusable={true}
              android_tv_focusable={true}
              onFocus={() => setSliderFocused(true)}
              onBlur={() => setSliderFocused(false)}
              style={[
                styles.sliderWrapper,
                sliderFocused && styles.sliderFocused
              ]}
            >
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration}
                value={currentTime}
                onValueChange={setCurrentTime}
                onSlidingStart={handleSeekStart}
                onSlidingComplete={handleSeekEnd}
                minimumTrackTintColor={sliderFocused ? "#00E5FF" : "#3b82f6"}
                maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                thumbTintColor={sliderFocused ? "#00E5FF" : "#fff"}
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* Settings Modal */}
      <Modal visible={settingsVisible} animationType="fade" transparent={true} onRequestClose={() => setSettingsVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSettingsVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.modalCenter}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Oynatıcı Ayarları</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSettingsVisible(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.modalItem} onPress={() => {
                const modes: ResizeMode[] = ['contain', 'cover', 'stretch'];
                const nextMode = modes[(modes.indexOf(resizeMode) + 1) % modes.length];
                setResizeMode(nextMode);
                storageService.setItem('default_resize_mode', nextMode);
              }}>
                <Text style={styles.modalItemLabel}>Görüntü Oranı</Text>
                <Text style={styles.modalItemValue}>
                  {resizeMode === 'contain' ? 'Sığdır' : resizeMode === 'cover' ? 'Kapla' : 'Uzat'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalItem} onPress={() => {
                const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
                const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                setPlaybackRate(nextRate);
              }}>
                <Text style={styles.modalItemLabel}>Oynatma Hızı</Text>
                <Text style={styles.modalItemValue}>{playbackRate}x</Text>
              </TouchableOpacity>

              <View style={styles.modalSliderItem}>
                <View style={styles.modalSliderHeader}>
                  <Text style={styles.modalItemLabel}>Ses Güçlendirme 🔊</Text>
                  <Text style={styles.modalItemValue}>
                    {audioBoostLevel <= 1.0 ? 'Kapalı' : `+${Math.round((audioBoostLevel - 1) * 100)}%`}
                  </Text>
                </View>
                <Slider
                  style={styles.boostSlider}
                  minimumValue={1.0}
                  maximumValue={3.0}
                  step={0.1}
                  value={audioBoostLevel}
                  onValueChange={(value) => setAudioBoostLevel(value)}
                  onSlidingComplete={(value) => {
                    // Değeri kaydet
                    storageService.setItem('audio_boost_level', value.toString());
                  }}
                  minimumTrackTintColor="#3b82f6"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                  thumbTintColor="#fff"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>1x</Text>
                  <Text style={styles.sliderLabel}>2x</Text>
                  <Text style={styles.sliderLabel}>3x</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Tracks Modal */}
      <Modal visible={tracksVisible} animationType="fade" transparent={true} onRequestClose={() => setTracksVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTracksVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.modalCenter}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ses & Altyazı</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setTracksVisible(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalSectionTitle}>Ses Dili</Text>
                {audioTracks.length > 0 ? audioTracks.map((track) => (
                  <TouchableOpacity key={track.index} style={styles.modalItem} onPress={() => {
                    setSelectedAudioTrack(track.index);
                    setTracksVisible(false);
                  }}>
                    <Text style={styles.modalItemLabel}>{track.title} ({track.language})</Text>
                    {selectedAudioTrack === track.index && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
                  </TouchableOpacity>
                )) : <Text style={styles.modalEmptyText}>Ses dili seçeneği yok</Text>}

                <Text style={styles.modalSectionTitle}>Altyazı</Text>
                <TouchableOpacity style={styles.modalItem} onPress={() => {
                  setSelectedTextTrack(-1);
                  setTracksVisible(false);
                }}>
                  <Text style={styles.modalItemLabel}>Kapalı</Text>
                  {selectedTextTrack === -1 && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
                </TouchableOpacity>
                {textTracks.map((track) => (
                  <TouchableOpacity key={track.index} style={styles.modalItem} onPress={() => {
                    setSelectedTextTrack(track.index);
                    setTracksVisible(false);
                  }}>
                    <Text style={styles.modalItemLabel}>{track.title} ({track.language})</Text>
                    {selectedTextTrack === track.index && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1, backgroundColor: '#000' },
  video: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  loadingText: { color: '#fff', fontSize: 16, fontFamily: fonts.medium, marginTop: 16 },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  topButton: { padding: 8, borderWidth: 2, borderColor: 'transparent', borderRadius: 12 },
  videoTitle: { flex: 1, color: '#fff', fontSize: 18, fontFamily: fonts.semibold, marginHorizontal: 12 },
  topRight: { flexDirection: 'row', gap: 8 },
  centerControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40 },
  controlButton: { padding: 12, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 50, borderWidth: 2, borderColor: 'transparent' },
  playButton: { padding: 20, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 60, borderWidth: 3, borderColor: 'transparent' },
  buttonFocused: { borderColor: '#00E5FF', transform: [{ scale: 1.1 }] },
  bottomBar: { paddingHorizontal: 20, paddingBottom: 20 },
  timeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeText: { color: '#fff', fontSize: 14, fontFamily: fonts.medium },
  timeSeparator: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, marginHorizontal: 4 },
  sliderWrapper: { width: '100%', borderWidth: 2, borderColor: 'transparent', borderRadius: 8, padding: 4 },
  sliderFocused: { borderColor: '#00E5FF' },
  slider: { width: '100%', height: 40 },
  errorContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorTitle: { color: '#fff', fontSize: 24, fontFamily: fonts.bold, marginTop: 20, marginBottom: 12 },
  errorMessage: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 16, fontFamily: fonts.regular, textAlign: 'center', marginBottom: 32 },
  errorButtons: { flexDirection: 'row', gap: 16 },
  errorButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, gap: 8 },
  errorButtonSecondary: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  errorButtonText: { color: '#fff', fontSize: 16, fontFamily: fonts.medium },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  modalCenter: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxHeight: '80%', backgroundColor: '#1e293b', borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontFamily: fonts.bold },
  closeButton: { padding: 4 },
  modalScrollView: { maxHeight: 400 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  modalItemLabel: { color: '#e2e8f0', fontSize: 16, fontFamily: fonts.medium },
  modalItemValue: { color: '#3b82f6', fontSize: 16, fontFamily: fonts.bold },
  modalSectionTitle: { color: '#94a3b8', fontSize: 14, fontFamily: fonts.bold, marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  modalEmptyText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 14, fontStyle: 'italic', paddingVertical: 8 },
  gestureFeedback: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -50 }, { translateY: -50 }], backgroundColor: 'rgba(0,0,0,0.7)', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  gestureText: { color: '#fff', fontSize: 18, fontFamily: fonts.bold, marginTop: 8 },
  tvFocusLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  // Slider için stiller
  modalSliderItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  modalSliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  boostSlider: { width: '100%', height: 40 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  sliderLabel: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, fontFamily: fonts.regular },
});

export default PlayerScreen;
