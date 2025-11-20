import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
  Alert,
  Linking,
  ScrollView,
  Platform,
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

type ResizeMode = 'contain' | 'cover' | 'stretch';

interface OnErrorData {
  error?: {
    localizedDescription?: string;
  };
}
import Slider from '@react-native-community/slider';
import { storageService, databaseService } from '@/services';
import { fonts } from '@/theme/fonts';
import { AudioBooster } from '@/utils/AudioBooster';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Track {
  index: number;
  title: string;
  language: string;
  selected: boolean;
}

const PlayerScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const videoRef = useRef<VideoRef>(null);

  // URL ve Title
  const streamUrl = Array.isArray(params.url) ? params.url[0] : params.url || '';
  const title = Array.isArray(params.title) ? params.title[0] : params.title || 'Video';
  const itemId = Array.isArray(params.id) ? params.id[0] : params.id || streamUrl;
  const itemType = Array.isArray(params.type) ? params.type[0] : params.type || 'movie';
  const poster = Array.isArray(params.poster) ? params.poster[0] : params.poster || '';

  // Debug logs
  useEffect(() => {
    console.log('🎬 Player Params:', { 
      streamUrl, 
      title, 
      itemId, 
      itemType,
      hasUrl: !!streamUrl,
      urlLength: streamUrl?.length 
    });
  }, [streamUrl, title, itemId, itemType]);

  // Player State
  const [paused, setPaused] = useState(false); // Başlangıçta false, otomatik başlasın
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);

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

  // Audio Boost Effect
  useEffect(() => {
    if (audioSessionId !== null) {
      AudioBooster.setBoost(audioSessionId, audioBoostLevel);
    }
  }, [audioSessionId, audioBoostLevel]);

  // Tracks
  const [audioTracks, setAudioTracks] = useState<Track[]>([]);
  const [textTracks, setTextTracks] = useState<Track[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(0);
  const [selectedTextTrack, setSelectedTextTrack] = useState<number>(-1);

  // Hide controls timer
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initialize();
    return () => {
      // Cleanup
      ScreenOrientation.unlockAsync();
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
      // Save progress on exit
      saveProgress();
      // Release Audio Booster
      AudioBooster.release();
    };
  }, []);

  const initialize = async () => {
    try {
      // Lock to landscape
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );

      // Load settings
      const savedResizeMode = await storageService.getItem<string>('default_resize_mode');
      if (savedResizeMode) setResizeMode(savedResizeMode as ResizeMode);

      const savedAudioBoost = await storageService.getItem<string>('audio_boost_level');
      if (savedAudioBoost) {
        const boostLevel = parseFloat(savedAudioBoost);
        setAudioBoostLevel(boostLevel);
        setVolume(Math.min(boostLevel, 1.0)); // Video component max volume is 1.0
      }

      // Check for resume point
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
          '⏯️ İzlemeye Devam Et',
          `Bu videoyu daha önce izlemişsiniz. Kaldığınız yerden (${minutes}:${seconds.toString().padStart(2, '0')}) devam etmek ister misiniz?`,
          [
            {
              text: 'Baştan Başla',
              onPress: () => {
                setResumeChecked(true);
                // Video zaten çalışıyor
              },
              style: 'cancel',
            },
            {
              text: 'Devam Et',
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
    
    // Eğer %95'ten fazla izlenmişse temizle
    if (progress >= 95) {
      await databaseService.removeContinueWatching(itemId);
      console.log('✅ Video tamamlandı, continue watching temizlendi');
      return;
    }

    // İlerlemeyi kaydet
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
      if (!paused) {
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
    if (!paused) {
      // Durdurulduğunda ilerlemeyi kaydet
      saveProgress();
    }
    setPaused(!paused);
    showControlsTemporarily();
  };

  const handleSeek = (time: number) => {
    videoRef.current?.seek(time);
    setCurrentTime(time);
  };

  const handleSeekStart = () => {
    setSeeking(true);
  };

  const handleSeekEnd = (value: number) => {
    setSeeking(false);
    handleSeek(value);
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    handleSeek(newTime);
    showControlsTemporarily();
  };

  const handleLoad = (data: OnLoadData) => {
    setLoading(false);
    setDuration(data.duration);
    setError(null);

    // Extract tracks if available
    if (data.audioTracks && data.audioTracks.length > 0) {
      const tracks = data.audioTracks.map((track: any, index: number) => ({
        index,
        title: track.title || `Audio ${index + 1}`,
        language: track.language || 'unknown',
        selected: index === 0,
      }));
      setAudioTracks(tracks);
    }

    if (data.textTracks && data.textTracks.length > 0) {
      const tracks = data.textTracks.map((track: any, index: number) => ({
        index,
        title: track.title || `Subtitle ${index + 1}`,
        language: track.language || 'unknown',
        selected: false,
      }));
      setTextTracks(tracks);
    }

    console.log('✅ Video loaded:', data.duration, 's');
  };

  const handleProgress = (data: OnProgressData) => {
    if (!seeking) {
      setCurrentTime(data.currentTime);
    }
  };

  const handleBuffer = (data: OnBufferData) => {
    setBuffering(data.isBuffering);
  };

  const handleError = (error: OnErrorData) => {
    console.error('❌ Video error:', error);
    console.error('Stream URL:', streamUrl);
    setLoading(false);
    const errorMsg = error.error?.localizedDescription || 'Video yüklenemedi';
    setError(`${errorMsg}\n\nURL: ${streamUrl.substring(0, 50)}...`);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Force re-render by changing key (implemented in Video component)
  };

  const handleBack = async () => {
    await ScreenOrientation.unlockAsync();
    router.back();
  };

  const handleOpenInVLC = async () => {
    try {
      const vlcUrl = `vlc://${streamUrl}`;
      const canOpen = await Linking.canOpenURL(vlcUrl);
      if (canOpen) {
        await Linking.openURL(vlcUrl);
      } else {
        Alert.alert('Hata', 'VLC Player yüklü değil');
      }
    } catch (error) {
      console.error('VLC open error:', error);
      Alert.alert('Hata', 'VLC açılamadı');
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar hidden />
        <Ionicons name="alert-circle-outline" size={80} color="#ef4444" />
        <Text style={styles.errorTitle}>Video Yüklenemedi</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity style={styles.errorButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.errorButtonText}>Yeniden Dene</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.errorButton, styles.errorButtonSecondary]}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.errorButtonText}>Geri Dön                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setSettingsVisible(false);
                  handleOpenInVLC();
                }}
              >
                <Ionicons name="open-outline" size={24} color="#3b82f6" />
                <Text style={[styles.modalItemLabel, { color: '#3b82f6', marginLeft: 12 }]}>
                  VLC'de Aç
                </Text>
              </TouchableOpacity>
            </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Video Player */}
      <Video
        ref={videoRef}
        source={{ uri: streamUrl }}
        style={styles.video}
        paused={paused}
        resizeMode={resizeMode}
        volume={volume}
        rate={playbackRate}
        playInBackground={true}
        playWhenInactive={false}
        bufferConfig={{
          minBufferMs: 15000,
          maxBufferMs: 50000,
          bufferForPlaybackMs: 2500,
          bufferForPlaybackAfterRebufferMs: 5000,
        }}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onBuffer={handleBuffer}
        onError={handleError}
        // @ts-ignore - onAudioSessionId types are missing in current version
        onAudioSessionId={(data: any) => {
          setAudioSessionId((prevId) => {
            if (prevId !== data.audioSessionId) {
              return data.audioSessionId;
            }
            return prevId;
          });
        }}
        audioOutput="speaker"
      />

      {/* Tap Area */}
      <TouchableWithoutFeedback onPress={handleScreenPress}>
        <View style={styles.tapArea} />
      </TouchableWithoutFeedback>

      {/* Loading Indicator */}
      {(loading || buffering) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>
            {loading ? 'Yükleniyor...' : 'Arabelleğe alınıyor...'}
          </Text>
        </View>
      )}

      {/* Controls Overlay */}
      {controlsVisible && (
        <View style={styles.controlsOverlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.topButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.videoTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.topRight}>
              <TouchableOpacity
                style={styles.topButton}
                onPress={() => setTracksVisible(true)}
              >
                <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topButton}
                onPress={() => setSettingsVisible(true)}
              >
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Controls */}
          <View style={styles.centerControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleSkip(-10)}
            >
              <Ionicons name="play-back" size={40} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={paused ? 'play' : 'pause'}
                size={60}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleSkip(10)}
            >
              <Ionicons name="play-forward" size={40} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeSeparator}>/</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration}
              value={currentTime}
              onValueChange={setCurrentTime}
              onSlidingStart={handleSeekStart}
              onSlidingComplete={handleSeekEnd}
              minimumTrackTintColor="#3b82f6"
              maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
              thumbTintColor="#fff"
            />
          </View>
        </View>
      )}

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSettingsVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Oynatıcı Ayarları</Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setSettingsVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  const modes: ResizeMode[] = ['contain', 'cover', 'stretch'];
                  const currentIndex = modes.indexOf(resizeMode);
                  const nextMode = modes[(currentIndex + 1) % modes.length];
                  setResizeMode(nextMode);
                  storageService.setItem('default_resize_mode', nextMode);
                }}
              >
                <Text style={styles.modalItemLabel}>Görüntü Oranı</Text>
                <Text style={styles.modalItemValue}>
                  {resizeMode === 'contain' ? 'Sığdır' : resizeMode === 'cover' ? 'Kapla' : 'Uzat'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
                  const currentIndex = rates.indexOf(playbackRate);
                  const nextRate = rates[(currentIndex + 1) % rates.length];
                  setPlaybackRate(nextRate);
                }}
              >
                <Text style={styles.modalItemLabel}>Oynatma Hızı</Text>
                <Text style={styles.modalItemValue}>{playbackRate}x</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  const levels = [1.0, 1.5, 2.0, 3.0];
                  // En yakın mevcut seviyeyi bul (kayan noktalı sayılar için)
                  const currentIndex = levels.findIndex(l => Math.abs(l - audioBoostLevel) < 0.1);
                  const nextLevel = levels[(currentIndex + 1) % levels.length];
                  setAudioBoostLevel(nextLevel);
                  // Anlık olarak kaydetmesek de olur, veya kaydedebiliriz.
                  // Kullanıcı kalıcı olmasını isterse Settings'den yapar.
                }}
              >
                <Text style={styles.modalItemLabel}>Ses Güçlendirme 🔊</Text>
                <Text style={styles.modalItemValue}>
                  {audioBoostLevel <= 1.0 ? 'Kapalı' : 
                   audioBoostLevel <= 1.5 ? 'Hafif' : 
                   audioBoostLevel <= 2.0 ? 'Güçlü' : 'Maksimum'}
                </Text>
              </TouchableOpacity>

             
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Tracks Modal */}
      <Modal
        visible={tracksVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setTracksVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTracksVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ses & Altyazı</Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setTracksVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalSectionTitle}>Ses Dili</Text>
                {audioTracks.length > 0 ? (
                  audioTracks.map((track) => (
                    <TouchableOpacity
                      key={track.index}
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedAudioTrack(track.index);
                        setTracksVisible(false);
                      }}
                    >
                      <Text style={styles.modalItemLabel}>
                        {track.title} ({track.language})
                      </Text>
                      {selectedAudioTrack === track.index && (
                        <Ionicons name="checkmark" size={20} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.modalEmptyText}>Ses dili seçeneği yok</Text>
                )}

                <Text style={styles.modalSectionTitle}>Altyazı</Text>
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedTextTrack(-1);
                    setTracksVisible(false);
                  }}
                >
                  <Text style={styles.modalItemLabel}>Kapalı</Text>
                  {selectedTextTrack === -1 && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
                {textTracks.map((track) => (
                  <TouchableOpacity
                    key={track.index}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedTextTrack(track.index);
                      setTracksVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemLabel}>
                      {track.title} ({track.language})
                    </Text>
                    {selectedTextTrack === track.index && (
                      <Ionicons name="checkmark" size={20} color="#3b82f6" />
                    )}
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
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.medium,
    marginTop: 16,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
  },
  topButton: {
    padding: 8,
  },
  videoTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontFamily: fonts.semibold,
    marginHorizontal: 12,
  },
  topRight: {
    flexDirection: 'row',
    gap: 8,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  controlButton: {
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
  },
  playButton: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 60,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  timeSeparator: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginHorizontal: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: fonts.bold,
    marginTop: 20,
    marginBottom: 12,
  },
  errorMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  errorButtonSecondary: {
    backgroundColor: '#374151',
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    width: '80%',
    height: '90%',
    maxWidth: 800, // Çok geniş tabletlerde aşırı yayılmayı önler ama telefonda tam genişlik sağlar
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  modalScrollView: {
    flex: 1,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 28,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  modalSectionTitle: {
    color: '#94a3b8',
    fontSize: 16,
    fontFamily: fonts.semibold,
    marginTop: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 64,
  },
  modalItemLabel: {
    color: '#fff',
    fontSize: 19,
    fontFamily: fonts.medium,
    flex: 1,
  },
  modalItemValue: {
    color: '#3b82f6',
    fontSize: 19,
    fontFamily: fonts.semibold,
  },
  modalEmptyText: {
    color: '#64748b',
    fontSize: 17,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    paddingVertical: 16,
  },
});

export default PlayerScreen;

