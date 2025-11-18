import CardComponent from '@/app/components/card-component';
import { useRouter, Redirect } from 'expo-router';
import { ImageBackground, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import storageService from '@/services/storage.service';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Uygulama açılışında credentials kontrolü
  useEffect(() => {
    checkStoredCredentials();
  }, []);

  const checkStoredCredentials = async () => {
    try {
      console.log('🔍 Checking stored credentials...');
      const storedCredentials = await storageService.getCredentials();
      if (!storedCredentials) {
        console.log('ℹ️ No stored credentials found, redirecting to login');
        // Eğer credentials yoksa login sayfasına yönlendir
        setShouldRedirect(true);
        setCheckingAuth(false);
        return;
      } else {
        console.log('✅ Stored credentials found');
        setCheckingAuth(false);
      }
    } catch (error) {
      console.error('❌ Credentials check error:', error);
      setShouldRedirect(true);
      setCheckingAuth(false);
    }
  };

  // Redirect işlemi
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
          <View style={[styles.cardContainer, { flexDirection: width > 768 ? 'row' : 'column' }]}>
            <TouchableOpacity 
              style={[
                styles.cardWrapper, 
                { 
                  width: width > 768 ? '32%' : '100%',
                  marginRight: width > 768 ? 16 : 0,
                  marginBottom: width > 768 ? 0 : 16,
                }
              ]}
              onPress={() => router.push('/live-tv')}
              activeOpacity={0.8}
            >
              <CardComponent 
                title="Canlı TV" 
                description="3000 Kanal" 
                image={require('@/assets/images/tv.png')} 
                style={styles.card} 
              /> 
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.cardWrapper, 
                { 
                  width: width > 768 ? '32%' : '100%',
                  marginRight: width > 768 ? 16 : 0,
                  marginBottom: width > 768 ? 0 : 16,
                }
              ]}
              onPress={() => router.push('/movies')}
              activeOpacity={0.8}
            >
              <CardComponent 
                title="Filmler" 
                description="1000 Film" 
                image={require('@/assets/images/film-rulo.png')} 
                style={styles.card} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.cardWrapper, 
                { 
                  width: width > 768 ? '32%' : '100%',
                  marginBottom: width > 768 ? 0 : 16,
                }
              ]}
              onPress={() => router.push('/series')}
              activeOpacity={0.8}
            >
              <CardComponent 
                title="Diziler" 
                description="39842 Dizi" 
                image={require('@/assets/images/tv-start.png')} 
                style={styles.card} 
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: Platform.OS === 'web' ? '100%' : '100%',
    height: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 100 : 0,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 40 : 20,
    paddingBottom: 20,
    ...(Platform.OS === 'web' && {
      maxWidth: 1400,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  headerContent: {
    flex: 1,
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
    fontSize: 34,
    fontWeight: 'semibold',
    letterSpacing: 1.5,
  },
  textDescription: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'normal',
    marginTop: 10,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    ...(Platform.OS === 'web' && {
      maxWidth: 1400,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  cardContainer: {
    width: '100%',
  },
  cardWrapper: {
    marginBottom: 0,
  },
  card: {
    width: '100%',
    height: Platform.OS === 'web' ? 280 : 200,
    justifyContent: 'flex-end',
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