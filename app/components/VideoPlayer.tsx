import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface VideoPlayerProps {
  channelName: string;
  channelDescription: string;
  channelType: string;
  streamUrl?: string;
  epgData?: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
  }[];
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channelName,
  channelDescription,
  channelType,
  streamUrl,
  epgData,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<Video>(null);

  console.log('🎬 VideoPlayer Props:', {
    channelName,
    channelDescription,
    channelType,
    streamUrl,
    epgDataLength: epgData?.length || 0,
  });

  console.log('🎬 VideoPlayer RENDER EDİLİYOR!');

  // Component unmount olduğunda video player'ı temizle
  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web' && videoRef.current) {
        try {
          videoRef.current.pauseAsync();
          console.log('🧹 Video player temizlendi');
        } catch (error) {
          console.error('Video temizleme hatası:', error);
        }
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (!streamUrl) {
      Alert.alert('Hata', 'Stream URL bulunamadı');
      return;
    }

    try {
      setIsLoading(true);
      
      if (Platform.OS === 'web') {
        // Web için HTML5 video kontrolü
        const webVideo = document.querySelector('video') as HTMLVideoElement;
        if (webVideo) {
          if (isPlaying) {
            webVideo.pause();
            setIsPlaying(false);
            console.log('⏸️ Video durduruldu');
          } else {
            try {
              await webVideo.play();
              setIsPlaying(true);
              console.log('▶️ Video başlatıldı');
            } catch (playError) {
              console.error('❌ Video play hatası:', playError);
              Alert.alert(
                'Play Hatası', 
                'Video oynatılamadı. Bu kanal şu anda yayında olmayabilir.',
                [{ text: 'Tamam' }]
              );
            }
          }
        } else {
          console.error('❌ Video elementi bulunamadı');
          Alert.alert('Hata', 'Video player bulunamadı');
        }
      } else {
        // Mobil için expo-av kontrolü
        if (!videoRef.current) {
          console.error('❌ Video ref bulunamadı');
          Alert.alert('Hata', 'Video player hazır değil');
          return;
        }

        if (isPlaying) {
          await videoRef.current.pauseAsync();
          setIsPlaying(false);
          console.log('⏸️ Video durduruldu (Android)');
        } else {
          await videoRef.current.playAsync();
          setIsPlaying(true);
          console.log('▶️ Video başlatıldı (Android)');
        }
      }
    } catch (error) {
      console.error('Video oynatma hatası:', error);
      
      // Android-specific hata mesajları
      if (Platform.OS === 'android') {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('MediaPlayer')) {
          Alert.alert(
            'Video Hatası', 
            'Bu video formatı Android\'de desteklenmiyor. Başka bir kanal deneyin.',
            [{ text: 'Tamam' }]
          );
        } else if (errorMessage.includes('network')) {
          Alert.alert(
            'Bağlantı Hatası', 
            'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
            [{ text: 'Tamam' }]
          );
        } else {
          Alert.alert(
            'Video Hatası', 
            'Video oynatılamadı. Bu kanal şu anda yayında olmayabilir.',
            [{ text: 'Tamam' }]
          );
        }
      } else {
        Alert.alert('Hata', 'Video oynatılamadı. Stream URL\'yi kontrol edin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoLoad = () => {
    console.log('✅ Video yüklendi');
    setIsLoading(false);
  };

  const handleVideoError = (error: any) => {
    console.error('❌ Video hatası:', error);
    setIsLoading(false);
    setIsPlaying(false);
    
    // Android-specific hata yönetimi
    if (Platform.OS === 'android') {
      if (error?.details === 'manifestLoadError' || error?.message?.includes('manifest')) {
        Alert.alert(
          'Stream Hatası', 
          'Bu kanal şu anda yayında değil veya teknik bir sorun var. Başka bir kanal deneyin.',
          [{ text: 'Tamam' }]
        );
      } else if (error?.type === 'networkError' || error?.message?.includes('network')) {
        Alert.alert(
          'Bağlantı Hatası', 
          'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      } else if (error?.message?.includes('MediaPlayer') || error?.message?.includes('format')) {
        Alert.alert(
          'Format Hatası', 
          'Bu video formatı Android\'de desteklenmiyor. Başka bir kanal deneyin.',
          [{ text: 'Tamam' }]
        );
      } else if (error?.message?.includes('timeout')) {
        Alert.alert(
          'Zaman Aşımı', 
          'Video yüklenirken zaman aşımı oluştu. Tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert(
          'Video Hatası', 
          'Video oynatılamadı. Bu kanal şu anda yayında olmayabilir.',
          [{ text: 'Tamam' }]
        );
      }
    } else {
      // Web için hata mesajları
      if (error?.details === 'manifestLoadError') {
        Alert.alert(
          'Stream Hatası', 
          'Bu kanal şu anda yayında değil veya teknik bir sorun var. Başka bir kanal deneyin.',
          [{ text: 'Tamam' }]
        );
      } else if (error?.type === 'networkError') {
        Alert.alert(
          'Bağlantı Hatası', 
          'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      } else if (error?.type === 'webError') {
        Alert.alert(
          'Video Hatası', 
          'Bu kanal web tarayıcısında oynatılamıyor. Mobil uygulamada deneyin.',
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert(
          'Video Hatası', 
          'Bu format desteklenmiyor. Mobil uygulamada deneyin.',
          [{ text: 'Tamam' }]
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Voice Search */}
      <View style={styles.voiceSearchContainer}>
        <TouchableOpacity style={styles.microphoneButton}>
          <Text style={styles.microphoneIcon}>🎤</Text>
        </TouchableOpacity>
        <Text style={styles.voiceSearchText}>
          Filmler ve diziler arasında ses ile arama yapın
        </Text>
      </View>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        <View style={styles.videoFrame}>
          {streamUrl ? (
            <>
              {Platform.OS === 'web' ? (
                <div style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
                  <video
                    style={{ width: '100%', height: '100%' }}
                    controls
                    playsInline
                    muted={false}
                    autoPlay={false}
                    preload="none"
                    src={streamUrl}
                    onLoadedMetadata={() => {
                      console.log('✅ Web video yüklendi');
                      handleVideoLoad();
                    }}
                    onError={(e) => {
                      console.error('❌ Web video hatası:', e);
                      handleVideoError({ type: 'webError', message: 'Video yüklenemedi' });
                    }}
                  />
                </div>
              ) : (
                <Video
                  ref={videoRef}
                  style={styles.video}
                  source={{ 
                    uri: streamUrl,
                    headers: {
                      'User-Agent': 'IPTV-Player/1.0',
                    }
                  }}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  isLooping={false}
                  isMuted={false}
                  volume={1.0}
                  rate={1.0}
                  onLoad={handleVideoLoad}
                  onError={handleVideoError}
                  onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded) {
                      setIsPlaying(status.isPlaying);
                    } else if ('error' in status) {
                      console.error('❌ Playback error:', status.error);
                      handleVideoError(status.error);
                    }
                  }}
                  onLoadStart={() => {
                    console.log('🔄 Video yüklenmeye başladı');
                    setIsLoading(true);
                  }}
                  onReadyForDisplay={() => {
                    console.log('✅ Video görüntülenmeye hazır');
                    setIsLoading(false);
                  }}
                />
              )}
              
              {/* Loading Overlay */}
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <Text style={styles.loadingText}>📺 Yükleniyor...</Text>
                </View>
              )}
              
              {/* Stream Info Overlay */}
              <View style={styles.streamInfoOverlay}>
                <Text style={styles.streamText}>📺 Canlı Yayın</Text>
                <Text style={styles.streamUrl}>{streamUrl}</Text>
              </View>
            </>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>📺 Kanal Seçin</Text>
              <Text style={styles.placeholderSubtext}>Bir kanala tıklayarak izlemeye başlayın</Text>
            </View>
          )}
          
          {/* Video Controls */}
          <View style={styles.controlsOverlay}>
            <View style={styles.topControls}>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>🔀</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>💬</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>⋯</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.centerControls}>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>⏮</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.playButton, isLoading && styles.playButtonDisabled]}
                onPress={handlePlayPause}
                disabled={isLoading}
              >
                <Text style={styles.playIcon}>
                  {isLoading ? '⏳' : isPlaying ? '⏸' : '▶️'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlIcon}>⏭</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.bottomControls}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.timeText}>1:48 / 4:32</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.channelName}>{channelName}</Text>
      </View>

      {/* Channel Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionTitle}>CANLI TV</Text>
        <Text style={styles.descriptionSubtitle}>{channelType}</Text>
        <Text style={styles.descriptionText}>
          {channelDescription}
        </Text>
        
        {/* EPG Data */}
        {epgData && epgData.length > 0 && (
          <View style={styles.epgContainer}>
            <Text style={styles.epgTitle}>📺 Şu An Yayında</Text>
            {epgData.slice(0, 3).map((program, index) => (
              <View key={index} style={styles.epgItem}>
                <Text style={styles.epgProgram}>{program.title}</Text>
                <Text style={styles.epgTime}>
                  {program.startTime} - {program.endTime}
                </Text>
                {program.description && (
                  <Text style={styles.epgDescription}>{program.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 42, 0.8)',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  voiceSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    justifyContent: 'flex-end',
  },
  microphoneButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  microphoneIcon: {
    fontSize: 20,
  },
  voiceSearchText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    flex: 1,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  videoContainer: {
    marginBottom: 24,
  },
  videoFrame: {
    width: '100%',
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  videoImage: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(13, 27, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(30, 144, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  controlIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  playIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
  },
  progressFill: {
    width: '40%',
    height: '100%',
    backgroundColor: '#1e90ff',
    borderRadius: 3,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  channelName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  descriptionContainer: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  descriptionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  descriptionSubtitle: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  streamContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  streamText: {
    color: '#1e90ff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  streamUrl: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  streamHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  epgContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 144, 255, 0.2)',
  },
  epgTitle: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  epgItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  epgProgram: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  epgTime: {
    color: '#1e90ff',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  epgDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  debugContainer: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'green',
  },
  debugText: {
    color: 'green',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#1e90ff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  streamInfoOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  playButtonDisabled: {
    backgroundColor: 'rgba(30, 144, 255, 0.5)',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  placeholderText: {
    color: '#1e90ff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  placeholderSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
});

export default VideoPlayer;
