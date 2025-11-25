import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Switch,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { storageService, authService, databaseService } from '@/services';
import { fonts } from '@/theme/fonts';
import syncService from '@/services/sync.service';

type SettingItemType = 'switch' | 'navigation' | 'info' | 'action' | 'selector';

interface SettingItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: SettingItemType;
  value?: string | boolean;
  options?: { label: string; value: any }[];
  onPress?: () => void;
  onValueChange?: (value: any) => void;
  badge?: string;
  badgeColor?: string;
  danger?: boolean;
}

interface SettingSection {
  title: string;
  emoji: string;
  data: SettingItem[];
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 MB';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const maskUrl = (url: string): string => {
  if (!url) return '';
  const parts = url.split('.');
  if (parts.length < 2) return url;
  return `${parts[0].substring(0, 3)}***${parts[parts.length - 1]}`;
};

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('Hiçbir zaman');

  // Account Info
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [credentials, setCredentials] = useState<any>(null);

  // Settings States
  const [audioBoost, setAudioBoost] = useState<number>(1.0);
  const [dialogEnhancement, setDialogEnhancement] = useState<boolean>(false);
  const [hwDecoder, setHwDecoder] = useState<boolean>(true);
  const [bufferMode, setBufferMode] = useState<'low' | 'normal' | 'high'>('normal');
  const [parentalControl, setParentalControl] = useState<boolean>(false);
  const [cacheSize, setCacheSize] = useState<string>('Hesaplanıyor...');
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  // Modal States
  const [audioBoostModal, setAudioBoostModal] = useState(false);
  const [bufferModeModal, setBufferModeModal] = useState(false);
  const [serverModal, setServerModal] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [savingServer, setSavingServer] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      await Promise.all([
        loadAccountInfo(),
        loadCredentials(),
        loadSettings(),
      ]);
    } catch (error) {
      console.error('Initialize error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccountInfo = async () => {
    try {
      const info = await authService.getAccountInfo();
      setAccountInfo(info);
    } catch (error) {
      console.error('Account info load error:', error);
    }
  };

  const loadCredentials = async () => {
    try {
      const creds = await storageService.getCredentials();
      setCredentials(creds);
      if (creds?.host) {
        setServerUrl(creds.host);
      }
    } catch (error) {
      console.error('Credentials load error:', error);
    }
  };

  const calculateCacheSize = async () => {
    try {
      let totalSize = 0;

      // FileSystem Cache
      const cacheDir = (FileSystem as any).cacheDirectory;
      if (cacheDir) {
        const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
        if (cacheInfo.exists && cacheInfo.isDirectory) {
          const files = await FileSystem.readDirectoryAsync(cacheDir);
          for (const file of files) {
            const fileInfo = await FileSystem.getInfoAsync(cacheDir + file);
            if (fileInfo.exists && !fileInfo.isDirectory) {
              totalSize += fileInfo.size;
            }
          }
        }
      }

      setCacheSize(formatBytes(totalSize));
    } catch (error) {
      console.error('Cache calculation error:', error);
      setCacheSize('Bilinmiyor');
    }
  };

  const loadSettings = async () => {
    try {
      // App Version
      const version = Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0';
      setAppVersion(version);

      // Cache Size
      calculateCacheSize();

      // Audio Boost
      const savedAudioBoost = await storageService.getItem<string>('audio_boost_level');
      if (savedAudioBoost) setAudioBoost(parseFloat(savedAudioBoost));

      // Dialog Enhancement
      const savedDialog = await storageService.getItem<string>('dialog_enhancement');
      if (savedDialog) setDialogEnhancement(savedDialog === 'true');

      // HW Decoder
      const savedHW = await storageService.getItem<string>('hw_decoder');
      if (savedHW !== null) setHwDecoder(savedHW === 'true');
      else setHwDecoder(true); // Default true

      // Buffer Mode
      const savedBuffer = await storageService.getItem<string>('buffer_mode');
      if (savedBuffer) setBufferMode(savedBuffer as 'low' | 'normal' | 'high');

      // Parental Control
      const savedParental = await storageService.getItem<string>('parental_control');
      if (savedParental) setParentalControl(savedParental === 'true');

      // Last Sync
      const savedLastSync = await storageService.getItem<string>('last_sync_time');
      if (savedLastSync) {
        const syncTime = new Date(parseInt(savedLastSync));
        const now = new Date();
        const diff = now.getTime() - syncTime.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) setLastSync('Az önce');
        else if (minutes < 60) setLastSync(`${minutes} dk önce`);
        else if (minutes < 1440) setLastSync(`${Math.floor(minutes / 60)} saat önce`);
        else setLastSync(`${Math.floor(minutes / 1440)} gün önce`);
      }
    } catch (error) {
      console.error('Settings load error:', error);
    }
  };

  const saveAudioBoost = async (value: number) => {
    setAudioBoost(value);
    await storageService.setItem('audio_boost_level', value.toString());
  };

  const saveDialogEnhancement = async (value: boolean) => {
    setDialogEnhancement(value);
    await storageService.setItem('dialog_enhancement', value.toString());
  };

  const saveHWDecoder = async (value: boolean) => {
    setHwDecoder(value);
    await storageService.setItem('hw_decoder', value.toString());
  };

  const saveBufferMode = async (value: 'low' | 'normal' | 'high') => {
    setBufferMode(value);
    await storageService.saveBufferMode(value);
  };

  const handleSync = async () => {
    if (syncing) return;

    Alert.alert(
      'İçeriği Güncelle',
      'Tüm içerikler (Kanallar, Filmler, Diziler) sunucudan tekrar indirilecektir. Bu işlem internet hızınıza bağlı olarak zaman alabilir.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Güncelle',
          onPress: async () => {
            try {
              setSyncing(true);
              await syncService.startSafeSync();

              // Update last sync time
              const now = Date.now().toString();
              await storageService.setItem('last_sync_time', now);
              setLastSync('Az önce');

              Alert.alert('Başarılı', 'Tüm içerikler başarıyla güncellendi.');
            } catch (error: any) {
              console.error('Sync error:', error);
              Alert.alert('Hata', error.message || 'Güncelleme sırasında bir hata oluştu.');
            } finally {
              setSyncing(false);
            }
          }
        }
      ]
    );
  };

  const handleClearHistory = async () => {
    Alert.alert(
      'Geçmişi Temizle',
      'İzleme geçmişiniz ve kaldığınız yerler silinecektir. Onaylıyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearHistory();
              await databaseService.clearContinueWatching();
              Alert.alert('Başarılı', 'İzleme geçmişi temizlendi.');
            } catch (error) {
              console.error('Clear history error:', error);
              Alert.alert('Hata', 'Geçmiş temizlenirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleClearFavorites = async () => {
    Alert.alert(
      'Favorileri Temizle',
      'Tüm favorileriniz silinecektir. Onaylıyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearFavorites();
              Alert.alert('Başarılı', 'Favoriler temizlendi.');
            } catch (error) {
              console.error('Clear favorites error:', error);
              Alert.alert('Hata', 'Favoriler temizlenirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Önbelleği Temizle',
      'Uygulama önbelleği temizlenecektir. Bu işlem biraz zaman alabilir.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear cache directory if possible, or just specific files
              // For safety, we'll just try to clear the cache directory contents
              const cacheDir = (FileSystem as any).cacheDirectory;
              if (cacheDir) {
                const files = await FileSystem.readDirectoryAsync(cacheDir);
                for (const file of files) {
                  await FileSystem.deleteAsync(cacheDir + file, { idempotent: true });
                }
              }
              calculateCacheSize(); // Recalculate
              Alert.alert('Başarılı', 'Önbellek temizlendi.');
            } catch (error) {
              console.error('Clear cache error:', error);
              Alert.alert('Hata', 'Önbellek temizlenirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleSaveServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Hata', 'Lütfen sunucu adresini girin');
      return;
    }

    Alert.alert(
      '⚠️ Sunucu Değişimi',
      'Sunucu değiştiğinde tüm veriler, favoriler ve izleme geçmişi silinecektir. Yeni sunucudan veriler tekrar indirilecektir.\n\nOnaylıyor musunuz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Onayla',
          style: 'destructive',
          onPress: async () => {
            try {
              setSavingServer(true);

              const currentCredentials = await storageService.getCredentials();

              if (!currentCredentials) {
                Alert.alert('Hata', 'Hesap bilgileri bulunamadı');
                setSavingServer(false);
                return;
              }

              const newCredentials = {
                ...currentCredentials,
                host: serverUrl.trim(),
              };

              console.log('🔄 Yeni sunucu ile bağlantı test ediliyor...');

              try {
                await authService.login(newCredentials);
                console.log('✅ Yeni sunucu ile bağlantı başarılı');
              } catch (authError: any) {
                console.error('❌ Sunucu bağlantı hatası:', authError);
                setSavingServer(false);
                Alert.alert(
                  'Bağlantı Hatası',
                  authError.message || 'Yeni sunucu adresine bağlanılamadı. Lütfen URL\'yi kontrol edin.'
                );
                return;
              }

              console.log('🗑️ Eski veriler siliniyor...');
              await databaseService.resetDatabase();

              console.log('💾 Yeni credentials kaydediliyor...');
              await storageService.saveCredentials(newCredentials);
              await storageService.removeItem('last_sync_time');

              setServerModal(false);
              setSavingServer(false);

              console.log('✅ Sunucu değişimi tamamlandı');

              Alert.alert(
                '✅ Başarılı',
                'Sunucu adresi güncellendi ve eski veriler temizlendi. Ana sayfadan "Güncelle" butonuna basarak yeni içerikleri indirebilirsiniz.',
                [
                  {
                    text: 'Tamam',
                    onPress: () => {
                      router.replace('/');
                    },
                  },
                ],
                { cancelable: false }
              );
            } catch (error: any) {
              console.error('❌ Sunucu değiştirme hatası:', error);
              setSavingServer(false);
              Alert.alert(
                'Hata',
                error.message || 'Sunucu değiştirilirken bir hata oluştu. Lütfen tekrar deneyin.'
              );
            }
          },
        },
      ]
    );
  };

  const getAudioBoostLabel = (value: number): string => {
    if (value === 1.0) return '🔇 Kapalı';
    if (value === 1.5) return '🔉 Hafif (+%50)';
    if (value === 2.0) return '🔊 Güçlü (+%100)';
    if (value === 3.0) return '📢 Maksimum (+%200)';
    return `${value}x`;
  };

  const sections: SettingSection[] = [
    {
      title: 'HESAP',
      emoji: '👤',
      data: [
        {
          id: 'username',
          title: 'Kullanıcı',
          icon: 'person-outline',
          type: 'info',
          value: accountInfo?.user_info?.username || credentials?.username || 'Bilinmiyor',
          badge: accountInfo?.user_info?.status === 'Active' ? 'Aktif' : 'Pasif',
          badgeColor: accountInfo?.user_info?.status === 'Active' ? '#10b981' : '#ef4444',
        },
        {
          id: 'server',
          title: 'Sunucu',
          icon: 'server-outline',
          type: 'action',
          value: credentials?.host ? maskUrl(credentials.host) : 'Bilinmiyor',
          badge: 'Düzenle',
          onPress: () => setServerModal(true),
        },
        {
          id: 'expiry',
          title: 'Bitiş Tarihi',
          icon: 'calendar-outline',
          type: 'info',
          value: accountInfo?.user_info?.exp_date
            ? new Date(accountInfo.user_info.exp_date * 1000).toLocaleDateString('tr-TR')
            : 'Bilinmiyor',
        },
      ],
    },
    {
      title: 'OYNATICI & SES',
      emoji: '🎬',
      data: [
        {
          id: 'audio_boost',
          title: 'Ses Güçlendirme',
          icon: 'volume-high-outline',
          type: 'selector',
          value: getAudioBoostLabel(audioBoost),
          onPress: () => setAudioBoostModal(true),
        },
        {
          id: 'dialog_enhancement',
          title: 'Diyalog İyileştirme',
          icon: 'chatbubbles-outline',
          type: 'switch',
          value: dialogEnhancement,
          onValueChange: saveDialogEnhancement,
        },
        {
          id: 'hw_decoder',
          title: 'Donanım Hızlandırma',
          icon: 'hardware-chip-outline',
          type: 'switch',
          value: hwDecoder,
          onValueChange: saveHWDecoder,
        },
        {
          id: 'buffer_mode',
          title: 'Tampon Bellek (Buffer)',
          icon: 'speedometer-outline',
          type: 'selector',
          value: bufferMode === 'low' ? 'Düşük' : bufferMode === 'high' ? 'Yüksek' : 'Normal',
          onPress: () => setBufferModeModal(true),
        },
      ],
    },
    {
      title: 'VERİ & SENKRONİZASYON',
      emoji: '☁️',
      data: [
        {
          id: 'sync',
          title: 'İçeriği Güncelle',
          icon: 'refresh-outline',
          type: 'action',
          value: lastSync,
          onPress: handleSync,
        },
        {
          id: 'clear_cache',
          title: 'Önbelleği Temizle',
          icon: 'trash-outline',
          type: 'action',
          value: cacheSize,
          onPress: handleClearCache,
        },
        {
          id: 'clear_history',
          title: 'Geçmişi Temizle',
          icon: 'time-outline',
          type: 'action',
          danger: true,
          onPress: handleClearHistory,
        },
        {
          id: 'clear_favorites',
          title: 'Favorileri Temizle',
          icon: 'heart-dislike-outline',
          type: 'action',
          danger: true,
          onPress: handleClearFavorites,
        },
      ],
    },
    {
      title: 'UYGULAMA',
      emoji: '📱',
      data: [
        {
          id: 'version',
          title: 'Sürüm',
          icon: 'information-circle-outline',
          type: 'info',
          value: appVersion,
        },
      ],
    },
  ];

  const renderItem = ({ item }: { item: SettingItem }) => {
    return (
      <TouchableOpacity
        style={[
          styles.settingItem,
          item.danger && styles.settingItemDanger,
        ]}
        onPress={item.onPress}
        disabled={!item.onPress && item.type !== 'switch'}
        activeOpacity={item.onPress || item.type === 'switch' ? 0.7 : 1}
      >
        <View style={styles.settingLeft}>
          <Ionicons
            name={item.icon}
            size={22}
            color={item.danger ? '#ef4444' : '#94a3b8'}
            style={styles.settingIcon}
          />
          <Text
            style={[
              styles.settingTitle,
              item.danger && styles.settingTitleDanger,
            ]}
          >
            {item.title}
          </Text>
        </View>

        <View style={styles.settingRight}>
          {item.type === 'switch' && typeof item.value === 'boolean' && (
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: '#374151', true: '#3b82f6' }}
              thumbColor={item.value ? '#ffffff' : '#9ca3af'}
              ios_backgroundColor="#374151"
            />
          )}

          {item.type === 'info' && item.badge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: item.badgeColor || '#3b82f6' },
              ]}
            >
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}

          {(item.type === 'info' || item.type === 'selector' || item.type === 'action') && item.value && (
            <Text
              style={[
                styles.settingValue,
                item.danger && styles.settingValueDanger,
              ]}
              numberOfLines={1}
            >
              {item.value}
            </Text>
          )}

          {item.type === 'action' && item.badge && (
            <View style={[styles.badge, { backgroundColor: '#3b82f6' }]}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}

          {(item.type === 'navigation' || item.type === 'selector' || item.type === 'action') && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={item.danger ? '#ef4444' : '#64748b'}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SettingSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {section.emoji} {section.title}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.headerSpacer} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
      />

      {/* Audio Boost Modal */}
      <Modal
        visible={audioBoostModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAudioBoostModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAudioBoostModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ses Güçlendirme</Text>
              <Text style={styles.modalSubtitle}>
                Düşük sesli yayınlar için ses seviyesini artırın
              </Text>
            </View>

            <View style={styles.modalOptions}>
              {[
                { value: 1.0, label: '🔇 Kapalı (1.0x)', subtitle: 'Normal ses seviyesi' },
                { value: 1.5, label: '🔉 Hafif (+%50)', subtitle: 'Biraz daha yüksek' },
                { value: 2.0, label: '🔊 Güçlü (+%100)', subtitle: 'İki kat ses' },
                { value: 3.0, label: '📢 Maksimum (+%200)', subtitle: 'Üç kat ses' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    audioBoost === option.value && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    saveAudioBoost(option.value);
                    setAudioBoostModal(false);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <Text
                      style={[
                        styles.modalOptionLabel,
                        audioBoost === option.value && styles.modalOptionLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.modalOptionSubtitle}>{option.subtitle}</Text>
                  </View>
                  {audioBoost === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Buffer Mode Modal */}
      <Modal
        visible={bufferModeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setBufferModeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBufferModeModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tampon Bellek (Buffer)</Text>
              <Text style={styles.modalSubtitle}>
                İnternet hızınıza göre video yükleme ayarını seçin
              </Text>
            </View>

            <View style={styles.modalOptions}>
              {[
                { value: 'low', label: '⚡ Düşük', subtitle: 'Hızlı internetler için (Daha az gecikme)' },
                { value: 'normal', label: '👍 Normal', subtitle: 'Önerilen ayar' },
                { value: 'high', label: '🐢 Yüksek', subtitle: 'Yavaş internetler için (Daha az donma)' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    bufferMode === option.value && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    saveBufferMode(option.value as 'low' | 'normal' | 'high');
                    setBufferModeModal(false);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <Text
                      style={[
                        styles.modalOptionLabel,
                        bufferMode === option.value && styles.modalOptionLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.modalOptionSubtitle}>{option.subtitle}</Text>
                  </View>
                  {bufferMode === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Server Edit Modal */}
      <Modal
        visible={serverModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !savingServer && setServerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !savingServer && setServerModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.serverModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sunucu Adresini Düzenle</Text>
                <Text style={styles.modalSubtitle}>
                  Yeni sunucu adresini girin
                </Text>
              </View>

              <View style={styles.serverModalBody}>
                <Text style={styles.inputLabel}>Sunucu URL</Text>
                <TextInput
                  style={styles.serverInput}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="örn: zunexle.live"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!savingServer}
                />
                <Text style={styles.inputHint}>
                  * Kullanıcı adı ve şifre değişmeyecektir
                </Text>
              </View>

              <View style={styles.serverModalFooter}>
                <TouchableOpacity
                  style={[styles.serverModalButton, styles.serverModalButtonCancel]}
                  onPress={() => setServerModal(false)}
                  disabled={savingServer}
                >
                  <Text style={styles.serverModalButtonTextCancel}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.serverModalButton,
                    styles.serverModalButtonSave,
                    savingServer && styles.serverModalButtonDisabled,
                  ]}
                  onPress={handleSaveServer}
                  disabled={savingServer}
                >
                  {savingServer ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.serverModalButtonTextSave}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sync Loading Overlay */}
      {syncing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>İçerikler Güncelleniyor...</Text>
            <Text style={styles.loadingSubText}>Lütfen bekleyin</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 16,
    fontFamily: fonts.medium,
  },
  loadingSubText: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
  },
  settingItemDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: '#fff',
    flex: 1,
  },
  settingTitleDanger: {
    color: '#ef4444',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#94a3b8',
    maxWidth: 150,
  },
  settingValueDanger: {
    color: '#ef4444',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#fff',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    marginHorizontal: 16,
  },
  sectionSeparator: {
    height: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
    backgroundColor: '#0f172a',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: '#fff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#94a3b8',
  },
  modalOptions: {
    padding: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionLabel: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: '#fff',
    marginBottom: 2,
  },
  modalOptionLabelActive: {
    color: '#3b82f6',
    fontFamily: fonts.bold,
  },
  modalOptionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#94a3b8',
  },
  serverModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  serverModalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#94a3b8',
    marginBottom: 8,
  },
  serverInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#64748b',
    marginTop: 8,
  },
  serverModalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  serverModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverModalButtonCancel: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  serverModalButtonSave: {
    backgroundColor: '#3b82f6',
  },
  serverModalButtonDisabled: {
    opacity: 0.7,
  },
  serverModalButtonTextCancel: {
    color: '#fff',
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  serverModalButtonTextSave: {
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingContent: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
});

export default SettingsScreen;
