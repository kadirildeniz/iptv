import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import authService from '@/services/auth.service';
import storageService from '@/services/storage.service';

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

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
      
      // API ile giriş yap
      const accountInfo = await authService.login(credentials);
      
      // Credentials'ları kaydet (IP TV ismi ile birlikte)
      await storageService.saveCredentials({
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        password: credentials.password,
        iptvName: iptvName.trim(),
        protocol: credentials.protocol,
      });
      
      Alert.alert('Başarılı', 'Giriş yapıldı!', [
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
    <SafeAreaView style={styles.container}>
      <View style={styles.gradientOverlay}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.formWrapper}>
              <View style={styles.formContainer}>
                <Text style={styles.welcomeTitle}>Sınırsız Eğlence Dünyasına Hoş Geldiniz</Text>
                <Text style={styles.welcomeSubtitle}>Hesabınıza giriş yapın</Text>

                <View style={styles.inputGroup}>
                  <MaterialCommunityIcons
                    name="television"
                    size={22}
                    color="#94a3b8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="IP TV İsminizi Girin"
                    placeholderTextColor="#94a3b8"
                    value={iptvName}
                    onChangeText={setIptvName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={22}
                    color="#94a3b8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Kullanıcı Adınızı Girin"
                    placeholderTextColor="#94a3b8"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={22}
                    color="#94a3b8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Şifrenizi Girin"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <MaterialCommunityIcons
                    name="link-variant"
                    size={22}
                    color="#94a3b8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="URL'inizi Girin"
                    placeholderTextColor="#94a3b8"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.rememberMe}
                    onPress={() => setRememberMe(prev => !prev)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && (
                        <MaterialCommunityIcons name="check" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.rememberMeText}>Beni Hatırla</Text>
                  </TouchableOpacity>

                  <TouchableOpacity>
                    <Text style={styles.forgotPassword}>Şifremi Unuttum?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Giriş Yap</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021129',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#021b56',
  },
  glowTop: {
    position: 'absolute',
    top: -140,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0, 51, 171, 0.35)',
    shadowColor: '#0033ab',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  glowBottom: {
    position: 'absolute',
    bottom: -160,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 51, 171, 0.28)',
    shadowColor: '#0033ab',
    shadowOpacity: 0.45,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#021129',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    minHeight: Platform.OS === 'web' ? '100%' : undefined,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  formContainer: {
    backgroundColor: 'rgba(8, 18, 47, 0.85)',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    color: '#cbd5f5',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 26, 66, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    padding: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#0033ab',
    borderColor: '#0033ab',
  },
  rememberMeText: {
    color: '#cbd5f5',
    fontSize: 13,
  },
  forgotPassword: {
    color: '#7aa5ff',
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#0033ab',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0033ab',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: 'rgba(0, 51, 171, 0.5)',
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

