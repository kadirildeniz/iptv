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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage } from '@/i18n/i18n';
import authService from '@/services/auth.service';
import storageService from '@/services/storage.service';
import apiClient from '@/services/api/client';
import { database } from '@/services';
import ChannelModel from '@/services/database/models/Channel';
import LiveCategoryModel from '@/services/database/models/LiveCategory';
import { isTV } from '@/utils/responsive';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

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
      throw new Error(t('login.invalidUrl'));
    }
  };

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setLanguageModalVisible(false);
  };

  const getCurrentLanguageLabel = () => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language);
    return lang ? lang.label : '🇬🇧 English';
  };

  const handleLogin = async () => {
    // === DEMO / İNCELEME MODU (Google Play Review Backdoor) ===
    // Demo mod kontrolü, form validasyonundan ÖNCE yapılmalı
    // çünkü demo modda URL ve IPTV ismi zorunlu değil
    if (username.trim() === 'demo' && password.trim() === '123456') {
      try {
        setLoading(true);
        console.log('🎬 Demo / İnceleme Modu aktif edildi');

        // 1. Sahte credential'ları kaydet (API çağrısı YAPILMAZ)
        const demoCredentials = {
          host: 'demo.test',
          port: '8080',
          username: 'demo',
          password: '123456',
          protocol: 'http' as const,
        };
        await apiClient.saveCredentials(demoCredentials);
        await storageService.saveCredentials({
          ...demoCredentials,
          iptvName: iptvName.trim() || 'Demo TV',
        });
        await storageService.setItem('baseUrl', 'demo.test:8080');
        await storageService.markFirstLoginCompleted();

        // 2. WatermelonDB'ye sahte kategori ve kanal verisi yaz
        if (database) {
          const db = database; // TypeScript null kontrolü için yerel referans
          await db.write(async () => {
            // Önce mevcut demo verilerini temizle (tekrar giriş durumunda)
            const existingCategories = await db
              .get<LiveCategoryModel>('live_categories')
              .query().fetch();
            const existingChannels = await db
              .get<ChannelModel>('channels')
              .query().fetch();

            const deleteOps = [
              ...existingCategories.map(c => c.prepareDestroyPermanently()),
              ...existingChannels.map(c => c.prepareDestroyPermanently()),
            ];

            // Sahte kategori
            const createCategoryOp = db
              .get<LiveCategoryModel>('live_categories')
              .prepareCreate((record: any) => {
                record.categoryId = '999';
                record.categoryName = 'Test Kanalları';
                record.cachedAt = Date.now();
              });

            // Sahte Kanal 1: Big Buck Bunny (W3.org üzerinden)
            const createChannel1Op = db
              .get<ChannelModel>('channels')
              .prepareCreate((record: any) => {
                record.streamId = 9001;
                record.name = 'Big Buck Bunny';
                record.streamType = 'live';
                record.streamIcon = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg';
                record.categoryId = '999';
                record.categoryIds = JSON.stringify([999]);
                record.directSource = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4';
                record.cachedAt = new Date();
              });

            // Sahte Kanal 2: Sintel Trailer (W3.org üzerinden)
            const createChannel2Op = db
              .get<ChannelModel>('channels')
              .prepareCreate((record: any) => {
                record.streamId = 9002;
                record.name = 'Sintel Trailer';
                record.streamType = 'live';
                record.streamIcon = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/320px-Sintel_poster.jpg';
                record.categoryId = '999';
                record.categoryIds = JSON.stringify([999]);
                record.directSource = 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4';
                record.cachedAt = new Date();
              });

            // Sahte Kanal 3: View From A Blue Moon (Plyr.io üzerinden)
            const createChannel3Op = db
              .get<ChannelModel>('channels')
              .prepareCreate((record: any) => {
                record.streamId = 9003;
                record.name = 'Blue Moon Trailer';
                record.streamType = 'live';
                record.streamIcon = 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.jpg';
                record.categoryId = '999';
                record.categoryIds = JSON.stringify([999]);
                record.directSource = 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4';
                record.cachedAt = new Date();
              });

            await db.batch(
              ...deleteOps,
              createCategoryOp,
              createChannel1Op,
              createChannel2Op,
              createChannel3Op,
            );
          });
          console.log('✅ Demo verileri WatermelonDB\'ye yazıldı');
        }

        // 3. Ana sayfaya yönlendir
        console.log('✅ Demo modu başarılı, ana sayfaya yönlendiriliyor...');
        router.replace('/');
      } catch (error: any) {
        console.error('❌ Demo mod hatası:', error);
        Alert.alert(t('common.error'), t('login.demoError'));
      } finally {
        setLoading(false);
      }
      return; // Gerçek API akışına devam etme
    }
    // === DEMO MOD SONU ===

    // Normal giriş için tüm alanlar zorunlu
    if (!iptvName || !username || !password || !url) {
      Alert.alert(t('common.error'), t('login.fillAllFields'));
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

      Alert.alert(t('common.success'), t('login.loginSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => router.replace('/'),
        },
      ]);

      console.log('✅ Login successful:', accountInfo);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      Alert.alert(t('common.error'), error.message || t('login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
              source={require('../assets/images/splashscreen_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.slogan}>{t('login.slogan')}</Text>
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
                {/* Dil Seçici Butonu */}
                <Pressable
                  focusable={true}
                  style={({ focused }) => [
                    styles.languageButton,
                    focused && {
                      borderColor: '#00E5FF',
                      borderWidth: 2,
                      transform: [{ scale: 1.05 }],
                    }
                  ]}
                  onPress={() => setLanguageModalVisible(true)}
                >
                  <Text style={styles.languageButtonText}>{getCurrentLanguageLabel()}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={18} color="#94a3b8" />
                </Pressable>

                <View style={styles.headerContainer}>
                  <Text style={styles.welcomeTitle}>{t('login.title')}</Text>
                  <Text style={styles.welcomeSubtitle}>{t('login.subtitle')}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.iptvName')}
                    placeholderTextColor="#64748b"
                    value={iptvName}
                    onChangeText={setIptvName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.username')}
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
                    placeholder={t('login.password')}
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
                    placeholder={t('login.serverUrl')}
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
                    <Text style={styles.loginButtonText}>{t('login.loginButton')}</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>

      {/* Dil Seçici Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={styles.languageModalContent}>
            <Text style={styles.languageModalTitle}>{t('login.selectLanguage')}</Text>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <Pressable
                key={lang.code}
                focusable={true}
                style={({ focused }) => [
                  styles.languageOption,
                  i18n.language === lang.code && styles.languageOptionActive,
                  focused && { borderColor: '#00E5FF', borderWidth: 2 },
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={[
                  styles.languageOptionText,
                  i18n.language === lang.code && styles.languageOptionTextActive,
                ]}>
                  {lang.label}
                </Text>
                {i18n.language === lang.code && (
                  <MaterialCommunityIcons name="check" size={20} color="#6366f1" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  // Dil Seçici Butonu
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  languageButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    marginRight: 4,
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
  // Dil Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: 300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  languageModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  languageOptionText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  languageOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
