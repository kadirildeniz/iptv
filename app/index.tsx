import CardComponent from '@/app/components/card-component';
import { useRouter } from 'expo-router';
import { ImageBackground, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import authService from '@/services/auth.service';
import storageService from '@/services/storage.service';

export default function HomeScreen() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  console.log('🏠 HomeScreen render ediliyor');
  
  // Login form state
  const [host, setHost] = useState('pent.live');
  const [port, setPort] = useState('8080');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Test için basit render
  if (checkingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d1b2a' }}>
        <Text style={{ color: 'white', fontSize: 24 }}>📱 IP-TV</Text>
        <Text style={{ color: 'white', fontSize: 16, marginTop: 10 }}>Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  // Uygulama açılışında credentials kontrolü
  useEffect(() => {
    checkStoredCredentials();
    
    // Güvenlik için 3 saniye sonra otomatik olarak false yap
    const timeout = setTimeout(() => {
      console.log('⏰ Timeout reached, setting checkingAuth to false');
      setCheckingAuth(false);
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, []);

  const checkStoredCredentials = async () => {
    try {
      console.log('🔍 Checking stored credentials...');
      const storedCredentials = await storageService.getCredentials();
      if (storedCredentials) {
        setHost(storedCredentials.host);
        setPort(storedCredentials.port);
        setUsername(storedCredentials.username);
        setIsLoggedIn(true);
        console.log('✅ Stored credentials found:', storedCredentials);
      } else {
        console.log('ℹ️ No stored credentials found');
      }
    } catch (error) {
      console.error('❌ Credentials check error:', error);
    } finally {
      console.log('✅ Setting checkingAuth to false');
      setCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    if (!host || !username || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔐 Login attempt:', { host, port, username });
      
      // Gerçek API ile giriş yap
      const credentials = {
        host: host.trim(),
        port: port.trim(),
        username: username.trim(),
        password: password.trim(),
      };

      const accountInfo = await authService.login(credentials);
      
      // Credentials'ları kaydet
      await storageService.saveCredentials(credentials);
      
      setIsLoggedIn(true);
      Alert.alert('Başarılı', 'Giriş yapıldı! Artık IPTV içeriklerine erişebilirsiniz.');
      console.log('✅ Login successful:', accountInfo);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      Alert.alert('Hata', error.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Stored credentials'ları temizle
      await storageService.clearCredentials();
      
      setIsLoggedIn(false);
      setPassword('');
      setUsername('');
      setHost('pent.live');
      setPort('8080');
      
      Alert.alert('Başarılı', 'Çıkış yapıldı');
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  if (checkingAuth) {
    return (
      <ImageBackground 
        source={require('@/assets/images/bg-home.png')}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e90ff" />
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
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.text}>IPTV+ Watch</Text>
          <Text style={styles.textDescription}>
          +39842 Dizi, +1000 Film ve izleyebileceğiniz yüzlerce içerik ile sizlerleyiz.
          </Text>

          {/* Login Form */}
          {!isLoggedIn ? (
            <View style={styles.loginContainer}>
              <Text style={styles.loginTitle}>🔐 IPTV Girişi</Text>
              <Text style={styles.loginSubtitle}>Xtream Codes bilgilerinizi girin</Text>
              
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHost]}
                  placeholder="Host (örn: zunexle.live)"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={host}
                  onChangeText={setHost}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.input, styles.inputPort]}
                  placeholder="Port"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={port}
                  onChangeText={setPort}
                  keyboardType="numeric"
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Giriş Yap</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loggedInContainer}>
              <Text style={styles.loggedInText}>✅ Giriş Yapıldı</Text>
              <Text style={styles.loggedInSubtext}>Host: {host}:{port}</Text>
              <Text style={styles.loggedInSubtext}>User: {username}</Text>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.cardContainer}>
            <TouchableOpacity onPress={() => router.push('/live-tv')}>
              <CardComponent title="Canlı TV" description="3000 Kanal" image={require('@/assets/images/tv.png')} style={[styles.card, {height: Platform.OS === 'web' ? 500 : 300}]} /> 
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/movies')}>
              <CardComponent title="Filmler" description="1000 Film" image={require('@/assets/images/film-rulo.png')} style={[styles.card, {height: Platform.OS === 'web' ? 400 : 200}]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/series')}>
              <CardComponent title="Diziler" description="39842 Dizi" image={require('@/assets/images/tv-start.png')} style={[styles.card, {height: Platform.OS === 'web' ? 400 : 200}]} />
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
  card: {
    width: Platform.OS === 'web' ? '33%' : '100%',
    height: Platform.OS === 'web' ? 500 : 200,
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    marginHorizontal: 0,
    marginTop: 100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    marginBottom: 30,
  },
  cardContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    width: Platform.OS === 'web' ? '100%' : '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginContainer: {
    backgroundColor: 'rgba(13, 27, 42, 0.9)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  loginTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  loginSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputHost: {
    flex: 3,
  },
  inputPort: {
    flex: 1,
  },
  loginButton: {
    backgroundColor: '#1e90ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: 'rgba(30, 144, 255, 0.5)',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loggedInContainer: {
    backgroundColor: 'rgba(46, 213, 115, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(46, 213, 115, 0.3)',
  },
  loggedInText: {
    color: '#2ed573',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  loggedInSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  logoutButtonText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
}); 