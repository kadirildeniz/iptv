import CardComponent from '@/app/components/card-component';
import { useRouter, Redirect } from 'expo-router';
import { ImageBackground, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, useWindowDimensions, Alert, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import storageService from '@/services/storage.service';
import { syncService } from '@/services';
import apiClient from '@/services/api/client';

export default function HomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  // Cihaz tipi belirleme
  const isTablet = width >= 768 && width < 1024;
  const isTV = width >= 1024;
  const isPhone = width < 768;
  
  // Ayrı ayrı sync durumları
  const [syncing, setSyncing] = useState({
    channels: false,
    movies: false,
    series: false,
  });
  
  const [syncProgress, setSyncProgress] = useState('');

  useEffect(() => {
    checkStoredCredentials();
  }, []);

  const checkStoredCredentials = async () => {
    try {
      console.log('🔍 Stored credentials kontrol ediliyor...');
      const storedCredentials = await storageService.getCredentials();
      if (!storedCredentials) {
        console.log('ℹ️ Credentials yok, login\'e yönlendiriliyor');
        setShouldRedirect(true);
        setCheckingAuth(false);
        return;
      } else {
        console.log('✅ Credentials bulundu');
        await apiClient.loadCredentials();
        setCheckingAuth(false);
      }
    } catch (error) {
      console.error('❌ Credentials kontrol hatası:', error);
      setShouldRedirect(true);
      setCheckingAuth(false);
    }
  };

  const handleSync = async (type: 'channels' | 'movies' | 'series') => {
    if (syncing[type]) return;

    try {
      setSyncing(prev => ({ ...prev, [type]: true }));
      setSyncProgress('Başlatılıyor...');
      
      await apiClient.loadCredentials();

      // Progress takibi
      syncService.setSyncProgressCallback((progress) => {
        if (progress.type === type) {
          setSyncProgress(progress.message);
        }
      });

      if (type === 'channels') {
        await syncService.syncChannelsOnly();
      } else if (type === 'movies') {
        await syncService.syncMoviesOnly();
      } else if (type === 'series') {
        await syncService.syncSeriesOnly();
      }

      Alert.alert(
        'Başarılı',
        `${type === 'channels' ? 'Canlı TV' : type === 'movies' ? 'Filmler' : 'Diziler'} başarıyla güncellendi!`,
        [{ text: 'Tamam' }]
      );
    } catch (error: any) {
      console.error(`❌ ${type} sync hatası:`, error);
      const errorMsg =
        error?.response?.status === 403
          ? 'Çok fazla istek yapıldı (403). Lütfen biraz bekleyip tekrar deneyin.'
          : error?.message || 'Güncelleme sırasında hata oluştu.';
      
      Alert.alert('Hata', errorMsg, [{ text: 'Tamam' }]);
    } finally {
      setSyncing(prev => ({ ...prev, [type]: false }));
      setSyncProgress('');
      syncService.removeSyncProgressCallback();
    }
  };

  if (shouldRedirect) {
    return <Redirect href="/login" />;
  }

  if (checkingAuth) {
    return (
      <ImageBackground
        source={require('@/assets/images/bg-home.png')}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('@/assets/images/bg-home.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.text}>IPTV+ Watch</Text>
              <Text style={styles.textDescription}>
                +39842 Dizi, +1000 Film ve izleyebileceğiniz yüzlerce içerik ile sizlerleyiz.
              </Text>
            </View>
          </View>
          <View style={styles.iconButtons}>
            <TouchableOpacity
              style={[styles.iconButton, { marginRight: 12 }]}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="person-circle-outline" size={28} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.cardContainer, { flexDirection: isPhone ? 'column' : 'row' }]}>
            
            {/* CANLI TV KARTI */}
            <View
              style={[
                styles.cardWrapper,
                {
                  width: isPhone ? '100%' : isTablet ? '32%' : '32%',
                  marginRight: isPhone ? 0 : 12,
                  marginBottom: isPhone ? 16 : 0,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => router.push('/live-tv')}
                activeOpacity={0.8}
                style={styles.cardTouchable}
              >
                <CardComponent
                  title="Canlı TV"
                  description="3000 Kanal"
                  image={require('@/assets/images/tv.png')}
                  style={styles.card}
                />
              </TouchableOpacity>
              
              {/* Canlı TV Güncelle Butonu */}
              <TouchableOpacity
                style={[styles.updateButton, syncing.channels && styles.updateButtonDisabled]}
                onPress={() => handleSync('channels')}
                disabled={syncing.channels}
                activeOpacity={0.8}
              >
                {syncing.channels ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.updateButtonText} numberOfLines={1}>
                        {syncProgress || 'Güncelleniyor...'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.updateButtonText}>Canlı TV Güncelle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* FİLMLER KARTI */}
            <View
              style={[
                styles.cardWrapper,
                {
                  width: isPhone ? '100%' : isTablet ? '32%' : '32%',
                  marginRight: isPhone ? 0 : 12,
                  marginBottom: isPhone ? 16 : 0,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => router.push('/movies')}
                activeOpacity={0.8}
                style={styles.cardTouchable}
              >
                <CardComponent
                  title="Filmler"
                  description="1000 Film"
                  image={require('@/assets/images/film-rulo.png')}
                  style={styles.card}
                />
              </TouchableOpacity>
              
              {/* Filmler Güncelle Butonu */}
              <TouchableOpacity
                style={[styles.updateButton, syncing.movies && styles.updateButtonDisabled]}
                onPress={() => handleSync('movies')}
                disabled={syncing.movies}
                activeOpacity={0.8}
              >
                {syncing.movies ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.updateButtonText} numberOfLines={1}>
                        {syncProgress || 'Güncelleniyor...'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.updateButtonText}>Filmleri Güncelle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* DİZİLER KARTI */}
            <View
              style={[
                styles.cardWrapper,
                {
                  width: isPhone ? '100%' : isTablet ? '32%' : '32%',
                  marginBottom: isPhone ? 16 : 0,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => router.push('/series')}
                activeOpacity={0.8}
                style={styles.cardTouchable}
              >
                <CardComponent
                  title="Diziler"
                  description="39842 Dizi"
                  image={require('@/assets/images/tv-start.png')}
                  style={styles.card}
                />
              </TouchableOpacity>

              {/* Diziler Güncelle Butonu */}
              <TouchableOpacity
                style={[styles.updateButton, syncing.series && styles.updateButtonDisabled]}
                onPress={() => handleSync('series')}
                disabled={syncing.series}
                activeOpacity={0.8}
              >
                {syncing.series ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.updateButtonText} numberOfLines={1}>
                        {syncProgress || 'Güncelleniyor...'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.updateButtonText}>Dizileri Güncelle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Bilgilendirme Metni */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              * İçerikleri güncellemek için ilgili kartın altındaki butona basınız.
            </Text>
            <Text style={styles.infoText}>
              * Film detayları artık listeye tıkladığınızda anlık olarak yüklenir ve kaydedilir.
            </Text>
            <Text style={styles.infoText}>
              * İşlem tamamlandıktan sonra uygulama offline olarak çalışacaktır.
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 20,
    paddingBottom: 12,
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
  },
  iconButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  text: {
    color: '#fff',
    fontSize: Platform.select({ android: 28, ios: 30, default: 34 }),
    fontWeight: '600',
    letterSpacing: 1,
  },
  textDescription: {
    color: '#fff',
    fontSize: Platform.select({ android: 12, ios: 13, default: 14 }),
    fontWeight: 'normal',
    marginTop: 6,
    opacity: 0.85,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80, // Daha fazla boşluk
    flexGrow: 1,
  },
  cardContainer: {
    width: '100%',
    flexGrow: 1,
  },
  cardWrapper: {
    marginBottom: 0,
    position: 'relative',
  },
  cardTouchable: {
    width: '100%',
  },
  card: {
    width: '100%',
    height: Math.min(Dimensions.get('window').height * 0.2, 180), // Ekran yüksekliğinin %20'si max 180px
    justifyContent: 'flex-end',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 12,
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.6)',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: 24,
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'left',
    lineHeight: 18,
    paddingLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
});
