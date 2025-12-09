import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import authService from '@/services/auth.service';
import storageService from '@/services/storage.service';
import { isTV } from '@/utils/responsive';

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form state
  const [iptvName, setIptvName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    // Sadece loading state'ini kapat, yönlendirme yapma
    // Kullanıcı login sayfasını görebilsin
    setCheckingAuth(false);
  }, []);

  const parseUrl = (urlString: string) => {
    try {
      // URL'yi parse et (örn: http://example.com:8080 veya example.com:8080)
      let cleanUrl = urlString.trim();

      // http:// veya https:// yoksa ekle
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'http://' + cleanUrl;
      }

      const urlObj = new URL(cleanUrl);
      const host = urlObj.hostname;
      const port = urlObj.port || '8080';
      const protocol = urlObj.protocol.replace(':', '') as 'http' | 'https';

      return { host, port, protocol };
    } catch (error) {
      throw new Error('Geçersiz URL formatı. Örnek: example.com:8080 veya http://example.com:8080');
    }
  };

  const handleLogin = async () => {
    if (!iptvName || !username || !password || !url) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setLoading(true);

      // URL'yi parse et
      const { host, port, protocol } = parseUrl(url);

      const credentials = {
        host,
        port,
        username: username.trim(),
        password: password.trim(),
        protocol,
      };

      console.log('🔐 Login attempt:', { host, port, username, iptvName });

      // API ile giriş yap (bu zaten apiClient.saveCredentials yapıyor)
      const accountInfo = await authService.login(credentials);

      // Ek olarak IP TV ismini ve diğer bilgileri storageService'e kaydet
      await storageService.saveCredentials({
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        password: credentials.password,
        iptvName: iptvName.trim(),
        protocol: credentials.protocol,
      });

      // Base URL'i de kaydet (sync service için gerekli)
      const baseUrl = `${credentials.host}${credentials.port ? ':' + credentials.port : ''}`;
      await storageService.setItem('baseUrl', baseUrl);

      // İlk giriş kontrolü
      const isFirstLogin = !(await storageService.isFirstLoginCompleted());

      if (isFirstLogin) {
        console.log('ℹ️ İlk giriş tespit edildi.');
        // İlk girişte otomatik sync yapılmayacak, kullanıcı ana sayfadan manuel yapacak
        // Ancak flag'i işaretleyelim ki tekrar sormasın
        await storageService.markFirstLoginCompleted();
      }

      Alert.alert('Başarılı', 'Giriş yapıldı! Lütfen ana sayfadaki "Tüm Verileri Güncelle" butonuna basarak içerikleri indirin.', [
        {
          text: 'Tamam',
          onPress: () => router.replace('/'),
        },
      ]);

      console.log('✅ Login successful:', accountInfo);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      Alert.alert('Hata', error.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.splitLayout}>
        {/* Sol Taraf - Logo ve Slogan */}
        <View style={styles.leftPanel}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/splash.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.slogan}>Sınırsız Eğlence</Text>
          </View>
        </View>

        {/* Sağ Taraf - Giriş Formu */}
        <View style={styles.rightPanel}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <View style={styles.formContainer}>
                <View style={styles.headerContainer}>
                  <Text style={styles.welcomeTitle}>Giriş Yap</Text>
                  <Text style={styles.welcomeSubtitle}>Hesabınıza erişmek için bilgilerinizi girin</Text>
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="IP TV İsmi (Örn: Ev TV)"
                    placeholderTextColor="#64748b"
                    value={iptvName}
                    onChangeText={setIptvName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="Kullanıcı Adı"
                    placeholderTextColor="#64748b"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="Şifre"
                    placeholderTextColor="#64748b"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="Sunucu Adresi (http://example.com:8080)"
                    placeholderTextColor="#64748b"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>

                <Pressable
                  focusable={true}
                  hasTVPreferredFocus={isTV}
                  style={({ pressed, focused }) => [
                    styles.loginButton,
                    loading && styles.loginButtonDisabled,
                    focused && {
                      borderColor: '#00E5FF',
                      borderWidth: 3,
                      transform: [{ scale: 1.05 }],
                    }
                  ]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Giriş Yap Test 123</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 0.4,
    backgroundColor: '#0033ab', // Logo arkaplanı ile eşleşmesi için mavi yapıldı
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  logo: {
    width: '90%',
    aspectRatio: 2.5,
    height: undefined,
    marginBottom: 10,
  },
  slogan: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 5,
  },
  rightPanel: {
    flex: 0.6,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 10, // Dikey boşluk azaltıldı
  },
  formContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  headerContainer: {
    marginBottom: 16, // Başlık boşluğu azaltıldı
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 22, // Font küçültüldü
    fontWeight: '700',
    marginBottom: 2,
  },
  welcomeSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 0,
  },
  inputGroup: {
    marginBottom: 10, // Boşluk azaltıldı
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8, // Radius azaltıldı
    height: 42, // Yükseklik 45 -> 42
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loginButton: {
    backgroundColor: '#0033ab',
    borderRadius: 8,
    height: 42, // Buton yüksekliği input ile eşitlendi
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0033ab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8, // Buton üstü boşluk
  },
  loginButtonDisabled: {
    backgroundColor: 'rgba(0, 51, 171, 0.5)',
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
});
