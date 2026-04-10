import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage } from '@/i18n/i18n';
import { storageService, authService, databaseService, database } from '@/services';
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
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');

  // Account Info
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [credentials, setCredentials] = useState<any>(null);

  // Settings States
  const [audioBoost, setAudioBoost] = useState<number>(1.0);
  const [dialogEnhancement, setDialogEnhancement] = useState<boolean>(false);
  const [preferredLanguage, setPreferredLanguage] = useState<string>('off');
  const [hwDecoder, setHwDecoder] = useState<boolean>(true);
  const [bufferMode, setBufferMode] = useState<'low' | 'normal' | 'high'>('normal');
  const [parentalControl, setParentalControl] = useState<boolean>(false);
  const [cacheSize, setCacheSize] = useState<string>('');
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  // Modal States
  const [audioBoostModal, setAudioBoostModal] = useState(false);
  const [bufferModeModal, setBufferModeModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);
  const [appLanguageModal, setAppLanguageModal] = useState(false);
  const [serverModal, setServerModal] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [savingServer, setSavingServer] = useState(false);

  // TV Focus States
  const isTV = Platform.isTV;
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [focusedModalOptionValue, setFocusedModalOptionValue] = useState<any>(null);

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
      // Demo modda API çağrısı yapma, sahte hesap bilgisi kullan
      const creds = await storageService.getCredentials();
      if (creds?.username === 'demo') {
        setAccountInfo({
          user_info: {
            username: 'demo',
            status: 'Active',
            auth: 1,
            exp_date: String(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60), // 1 yıl sonra
            message: 'Demo Modu',
          },
          server_info: {},
        });
        return;
      }
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
      setCacheSize(t('common.unknown'));
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

      // Dialog Enhancement (legacy)
      const savedDialog = await storageService.getItem<string>('dialog_enhancement');
      if (savedDialog) setDialogEnhancement(savedDialog === 'true');

      // Preferred Audio Language
      const savedLang = await storageService.getItem<string>('preferred_audio_language');
      if (savedLang) setPreferredLanguage(savedLang);

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
        if (minutes < 1) setLastSync(t('common.justNow'));
        else if (minutes < 60) setLastSync(t('common.minutesAgo', { count: minutes }));
        else if (minutes < 1440) setLastSync(t('common.hoursAgo', { count: Math.floor(minutes / 60) }));
        else setLastSync(t('common.daysAgo', { count: Math.floor(minutes / 1440) }));
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

  const savePreferredLanguage = async (lang: string) => {
    setPreferredLanguage(lang);
    await storageService.setPreferredAudioLanguage(lang);
  };

  // Dil kodu -> Görüntü adı
  const getLanguageLabel = (code: string): string => {
    const labels: Record<string, string> = {
      'off': t('settings.langOff'),
      'tur': t('settings.langTurkish'),
      'eng': t('settings.langEnglish'),
      'ger': t('settings.langGerman'),
      'fra': t('settings.langFrench'),
      'spa': t('settings.langSpanish'),
      'ara': t('settings.langArabic'),
      'rus': t('settings.langRussian'),
      'original': t('settings.langOriginal')
    };
    return labels[code] || code;
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
      t('settings.updateContent'),
      t('settings.updateContentConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.update'),
          onPress: async () => {
            try {
              setSyncing(true);
              await syncService.startSafeSync();

              // Update last sync time
              const now = Date.now().toString();
              await storageService.setItem('last_sync_time', now);
              setLastSync(t('common.justNow'));

              Alert.alert(t('common.success'), t('settings.updateSuccess'));
            } catch (error: any) {
              console.error('Sync error:', error);
              Alert.alert(t('common.error'), error.message || t('settings.updateError'));
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
      t('settings.clearHistory'),
      t('settings.clearHistoryConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clean'),
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearHistory();
              await databaseService.clearContinueWatching();
              Alert.alert(t('common.success'), t('settings.clearHistorySuccess'));
            } catch (error) {
              console.error('Clear history error:', error);
              Alert.alert(t('common.error'), t('settings.clearHistoryError'));
            }
          }
        }
      ]
    );
  };

  const handleClearFavorites = async () => {
    Alert.alert(
      t('settings.clearFavorites'),
      t('settings.clearFavoritesConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clean'),
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearFavorites();
              Alert.alert(t('common.success'), t('settings.clearFavoritesSuccess'));
            } catch (error) {
              console.error('Clear favorites error:', error);
              Alert.alert(t('common.error'), t('settings.clearFavoritesError'));
            } finally {
              setSyncing(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutConfirmTitle', 'Çıkış Yap'),
      t('settings.logoutConfirmMessage', 'Tüm verileriniz ve ayarlarınız silinecek. Çıkış yapmak istediğinize emin misiniz?'),
      [
        { text: t('common.cancel', 'Hayır'), style: 'cancel' },
        {
          text: t('settings.logout', 'Çıkış Yap'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // AsyncStorage ve Auth verilerini temizle
              await AsyncStorage.clear();
              await authService.logout();

              // Veritabanını sıfırla
              if (database) {
                const db = database;
                await db.write(async () => {
                  try {
                    await db.unsafeResetDatabase();
                  } catch (dbError) {
                    console.error('Database reset failed:', dbError);
                  }
                });
              }

              // Login sayfasına yönlendir
              router.replace('/login');
            } catch (err) {
              console.error('Logout error:', err);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      t('settings.clearCache'),
      t('settings.clearCacheConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
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
              Alert.alert(t('common.success'), t('settings.clearCacheSuccess'));
            } catch (error) {
              console.error('Clear cache error:', error);
              Alert.alert(t('common.error'), t('settings.clearCacheError'));
            }
          }
        }
      ]
    );
  };

  const handleSaveServer = async () => {
    if (!serverUrl || serverUrl.trim() === '') {
      Alert.alert(t('common.error'), t('settings.enterServerUrl'));
      return;
    }

    Alert.alert(
      t('settings.serverChangeTitle'),
      t('settings.serverChangeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              setSavingServer(true);

              const currentCredentials = await storageService.getCredentials();

              if (!currentCredentials) {
                setSavingServer(false);
                Alert.alert(t('common.error'), t('settings.accountNotFound'));
                return;
              }

              const newCredentials = {
                ...currentCredentials,
                host: serverUrl.trim(),
              };

              try {
                await authService.login(newCredentials);
              } catch (networkError) {
                console.error('New server connection failed:', networkError);
                setSavingServer(false);
                Alert.alert(
                  t('settings.connectionErrorTitle'),
                  t('settings.connectionError')
                );
                return;
              }

              await databaseService.resetDatabase();
              await storageService.saveCredentials(newCredentials);
              await storageService.removeItem('last_sync_time');

              setServerModal(false);
              setSavingServer(false);

              Alert.alert(
                t('common.success'),
                t('settings.serverChangeSuccess'),
                [
                  {
                    text: t('common.ok'),
                    onPress: () => {
                      router.replace('/');
                    },
                  },
                ],
                { cancelable: false }
              );
            } catch (error) {
              console.error('Change server error:', error);
              setSavingServer(false);
              Alert.alert(
                t('common.error'),
                t('settings.serverChangeError')
              );
            }
          },
        },
      ]
    );
  };

  const getAudioBoostLabel = (value: number): string => {
    if (value === 1.0) return t('settings.audioBoostOff');
    if (value === 1.5) return t('settings.audioBoostLight');
    if (value === 2.0) return t('settings.audioBoostStrong');
    if (value === 3.0) return t('settings.audioBoostMax');
    return `${value}x`;
  };

  const sections: SettingSection[] = [
    {
      title: t('settings.account'),
      emoji: '👤',
      data: [
        {
          id: 'username',
          title: t('settings.user'),
          icon: 'person-outline',
          type: 'info',
          value: accountInfo?.user_info?.username || credentials?.username || t('common.unknown'),
          badge: accountInfo?.user_info?.status === 'Active' ? t('settings.active') : t('settings.inactive'),
          badgeColor: accountInfo?.user_info?.status === 'Active' ? '#10b981' : '#ef4444',
        },
        {
          id: 'server',
          title: t('settings.server'),
          icon: 'server-outline',
          type: 'action',
          value: credentials?.host ? maskUrl(credentials.host) : t('common.unknown'),
          badge: t('settings.edit'),
          onPress: () => setServerModal(true),
        },
        {
          id: 'expiry',
          title: t('settings.expiryDate'),
          icon: 'calendar-outline',
          type: 'info',
          value: accountInfo?.user_info?.exp_date
            ? new Date(accountInfo.user_info.exp_date * 1000).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : i18n.language === 'de' ? 'de-DE' : i18n.language === 'es' ? 'es-ES' : 'en-US')
            : t('common.unknown'),
        },
      ],
    },
    {
      title: t('settings.playerAndAudio'),
      emoji: '🎬',
      data: [
        {
          id: 'audio_boost',
          title: t('settings.audioBoost'),
          icon: 'volume-high-outline',
          type: 'selector',
          value: getAudioBoostLabel(audioBoost),
          onPress: () => setAudioBoostModal(true),
        },
        {
          id: 'preferred_language',
          title: t('settings.preferredAudioLang'),
          icon: 'language-outline',
          type: 'selector',
          value: getLanguageLabel(preferredLanguage),
          onPress: () => setLanguageModal(true),
        },
        {
          id: 'hw_decoder',
          title: t('settings.hwAcceleration'),
          icon: 'hardware-chip-outline',
          type: 'switch',
          value: hwDecoder,
          onValueChange: saveHWDecoder,
        },
        {
          id: 'buffer_mode',
          title: t('settings.bufferMode'),
          icon: 'speedometer-outline',
          type: 'selector',
          value: bufferMode === 'low' ? t('settings.bufferLow') : bufferMode === 'high' ? t('settings.bufferHigh') : t('settings.bufferNormal'),
          onPress: () => setBufferModeModal(true),
        },
      ],
    },
    {
      title: t('settings.dataAndSync'),
      emoji: '☁️',
      data: [
        {
          id: 'sync',
          title: t('settings.updateContent'),
          icon: 'refresh-outline',
          type: 'action',
          value: lastSync || t('common.never'),
          onPress: handleSync,
        },
        {
          id: 'clear_cache',
          title: t('settings.clearCache'),
          icon: 'trash-outline',
          type: 'action',
          value: cacheSize || t('common.calculating'),
          onPress: handleClearCache,
        },
        {
          id: 'clear_history',
          title: t('settings.clearHistory'),
          icon: 'time-outline',
          type: 'action',
          danger: true,
          onPress: handleClearHistory,
        },
        {
          id: 'clear_favorites',
          title: t('settings.clearFavorites'),
          icon: 'heart-dislike-outline',
          type: 'action',
          danger: true,
          onPress: handleClearFavorites,
        },
      ],
    },
    {
      title: t('settings.app'),
      emoji: '📱',
      data: [
        {
          id: 'app_language',
          title: t('settings.language'),
          icon: 'globe-outline',
          type: 'selector',
          value: SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.label || '🇬🇧 English',
          onPress: () => setAppLanguageModal(true),
        },
        {
          id: 'version',
          title: t('settings.version'),
          icon: 'information-circle-outline',
          type: 'info',
          value: appVersion,
        },
        {
          id: 'logout',
          title: t('settings.logout', 'Çıkış Yap'),
          icon: 'log-out-outline',
          type: 'action',
          danger: true,
          onPress: handleLogout,
        },
      ],
    },
    // Geliştirici bölümü sadece development modunda görünsün
    ...(__DEV__ ? [{
      title: t('settings.developer'),
      emoji: '🛠️',
      data: [
        {
          id: 'debug_database',
          title: 'Database Debug',
          icon: 'server-outline' as keyof typeof Ionicons.glyphMap,
          type: 'action' as SettingItemType,
          value: 'Konsola yazdır',
          onPress: async () => {
            Alert.alert('Debug', 'WatermelonDB verileri konsola yazdırılıyor...');
            await databaseService.debugDatabase();
          },
        },
        {
          id: 'debug_storage',
          title: 'Storage Debug',
          icon: 'folder-outline' as keyof typeof Ionicons.glyphMap,
          type: 'action' as SettingItemType,
          value: 'Konsola yazdır',
          onPress: async () => {
            Alert.alert('Debug', 'AsyncStorage verileri konsola yazdırılıyor...');
            await storageService.debugAll();
          },
        },
        {
          id: 'debug_movies_table',
          title: 'Movies Tablosu',
          icon: 'film-outline' as keyof typeof Ionicons.glyphMap,
          type: 'action' as SettingItemType,
          value: 'İlk 10 kayıt',
          onPress: async () => {
            Alert.alert('Debug', 'Movies tablosu konsola yazdırılıyor...');
            await databaseService.debugTable('movies', 10);
          },
        },
        {
          id: 'debug_series_table',
          title: 'Series Tablosu',
          icon: 'tv-outline' as keyof typeof Ionicons.glyphMap,
          type: 'action' as SettingItemType,
          value: 'İlk 10 kayıt',
          onPress: async () => {
            Alert.alert('Debug', 'Series tablosu konsola yazdırılıyor...');
            await databaseService.debugTable('series', 10);
          },
        },
      ],
    }] : []),
  ];

  const renderItem = ({ item }: { item: SettingItem }) => {
    const isFocused = focusedItemId === item.id;

    return (
      <Pressable
        style={[
          styles.settingItem,
          item.danger && styles.settingItemDanger,
          isTV && isFocused && styles.settingItemFocused,
        ]}
        onPress={item.onPress}
        disabled={!item.onPress && item.type !== 'switch'}
        focusable={isTV}
        isTVSelectable={isTV}
        onFocus={isTV ? () => setFocusedItemId(item.id) : undefined}
        onBlur={isTV ? () => setFocusedItemId(null) : undefined}
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
      </Pressable>
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
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
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
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAudioBoostModal(false)}
          focusable={false}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderWithClose}>
              <View>
                <Text style={styles.modalTitle}>{t('settings.audioBoostTitle')}</Text>
                <Text style={styles.modalSubtitle}>
                  {t('settings.audioBoostDescAlt')}
                </Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => setAudioBoostModal(false)}
                focusable={isTV}
                isTVSelectable={isTV}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.modalOptions}>
              {[
                { value: 1.0, label: t('settings.audioLevel0Title'), subtitle: t('settings.audioLevel0Desc') },
                { value: 1.5, label: t('settings.audioLevel1Title'), subtitle: t('settings.audioLevel1Desc') },
                { value: 2.0, label: t('settings.audioLevel2Title'), subtitle: t('settings.audioLevel2Desc') },
                { value: 3.0, label: t('settings.audioLevel3Title'), subtitle: t('settings.audioLevel3Desc') },
              ].map((option, index) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.modalOption,
                    audioBoost === option.value && styles.modalOptionActive,
                    isTV && focusedModalOptionValue === option.value && styles.modalOptionFocused,
                  ]}
                  onPress={() => {
                    saveAudioBoost(option.value);
                    setAudioBoostModal(false);
                  }}
                  focusable={isTV}
                  isTVSelectable={isTV}
                  hasTVPreferredFocus={isTV && index === 0 && audioBoostModal}
                  onFocus={isTV ? () => setFocusedModalOptionValue(option.value) : undefined}
                  onBlur={isTV ? () => setFocusedModalOptionValue(null) : undefined}
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
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Buffer Mode Modal */}
      <Modal
        visible={bufferModeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setBufferModeModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBufferModeModal(false)}
          focusable={false}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderWithClose}>
              <View>
                <Text style={styles.modalTitle}>{t('settings.bufferModeTitle')}</Text>
                <Text style={styles.modalSubtitle}>
                  {t('settings.bufferModeDesc')}
                </Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => setBufferModeModal(false)}
                focusable={isTV}
                isTVSelectable={isTV}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.modalOptions}>
              {[
                { value: 'low', label: t('settings.bufferLowTitle'), subtitle: t('settings.bufferLowDesc') },
                { value: 'normal', label: t('settings.bufferNormalTitle'), subtitle: t('settings.bufferNormalDesc') },
                { value: 'high', label: t('settings.bufferHighTitle'), subtitle: t('settings.bufferHighDesc') },
              ].map((option, index) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.modalOption,
                    bufferMode === option.value && styles.modalOptionActive,
                    isTV && focusedModalOptionValue === option.value && styles.modalOptionFocused,
                  ]}
                  onPress={() => {
                    saveBufferMode(option.value as 'low' | 'normal' | 'high');
                    setBufferModeModal(false);
                  }}
                  focusable={isTV}
                  isTVSelectable={isTV}
                  hasTVPreferredFocus={isTV && index === 0 && bufferModeModal}
                  onFocus={isTV ? () => setFocusedModalOptionValue(option.value) : undefined}
                  onBlur={isTV ? () => setFocusedModalOptionValue(null) : undefined}
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
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLanguageModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLanguageModal(false)}
          focusable={false}
        >
          <View
            style={styles.languageModalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeaderWithClose}>
              <View>
                <Text style={styles.modalTitle}>{t('settings.audioModalTitle')}</Text>
                <Text style={styles.modalSubtitle}>
                  {t('settings.audioModalDesc')}
                </Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => setLanguageModal(false)}
                focusable={isTV}
                isTVSelectable={isTV}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.languageScrollView}
              showsVerticalScrollIndicator={true}
            >
              {[
                { value: 'off', label: t('settings.langOff', '❌ Kapalı'), subtitle: t('settings.langOffDesc') },
                { value: 'tur', label: t('settings.langTurkish', '🇹🇷 Türkçe'), subtitle: t('settings.langTurDesc') },
                { value: 'eng', label: t('settings.langEnglish', '🇬🇧 İngilizce'), subtitle: t('settings.langEngDesc') },
                { value: 'ger', label: t('settings.langGerman', '🇩🇪 Almanca'), subtitle: t('settings.langGerDesc') },
                { value: 'fra', label: t('settings.langFrench', '🇫🇷 Fransızca'), subtitle: t('settings.langFraDesc') },
                { value: 'spa', label: t('settings.langSpanish', '🇪🇸 İspanyolca'), subtitle: t('settings.langSpaDesc') },
                { value: 'ara', label: t('settings.langArabic', '🇸🇦 Arapça'), subtitle: t('settings.langAraDesc') },
                { value: 'rus', label: t('settings.langRussian', '🇷🇺 Rusça'), subtitle: t('settings.langRusDesc') },
                { value: 'original', label: t('settings.langOriginal', '🎬 Orijinal'), subtitle: t('settings.langOriginalDesc') },
              ].map((option, index) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.modalOption,
                    preferredLanguage === option.value && styles.modalOptionActive,
                    isTV && focusedModalOptionValue === option.value && styles.modalOptionFocused,
                  ]}
                  onPress={() => {
                    savePreferredLanguage(option.value);
                    setLanguageModal(false);
                  }}
                  focusable={isTV}
                  isTVSelectable={isTV}
                  hasTVPreferredFocus={isTV && index === 0 && languageModal}
                  onFocus={isTV ? () => setFocusedModalOptionValue(option.value) : undefined}
                  onBlur={isTV ? () => setFocusedModalOptionValue(null) : undefined}
                >
                  <View style={styles.modalOptionContent}>
                    <Text
                      style={[
                        styles.modalOptionLabel,
                        preferredLanguage === option.value && styles.modalOptionLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.modalOptionSubtitle}>{option.subtitle}</Text>
                  </View>
                  {preferredLanguage === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Server Edit Modal */}
      <Modal
        visible={serverModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !savingServer && setServerModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !savingServer && setServerModal(false)}
          focusable={false}
        >
          <View
            style={styles.serverModalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeaderWithClose}>
              <View>
                <Text style={styles.modalTitle}>{t('settings.serverEditTitle')}</Text>
                <Text style={styles.modalSubtitle}>
                  {t('settings.serverEditDesc')}
                </Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => !savingServer && setServerModal(false)}
                focusable={isTV}
                isTVSelectable={isTV}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.serverModalBody}>
              <Text style={styles.inputLabel}>{t('settings.serverUrlLabel')}</Text>
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
                {t('settings.serverUrlHint')}
              </Text>
            </View>

            <View style={styles.serverModalFooter}>
              <Pressable
                style={[styles.serverModalButton, styles.serverModalButtonCancel, isTV && focusedItemId === 'cancelServerEdit' && styles.modalOptionFocused]}
                onPress={() => setServerModal(false)}
                disabled={savingServer}
                focusable={isTV}
                isTVSelectable={isTV}
                hasTVPreferredFocus={isTV && serverModal}
                onFocus={isTV ? () => setFocusedItemId('cancelServerEdit') : undefined}
                onBlur={isTV ? () => setFocusedItemId(null) : undefined}
              >
                <Text style={styles.serverModalButtonTextCancel}>{t('settings.btnCancel')}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.serverModalButton,
                  styles.serverModalButtonSave,
                  savingServer && styles.serverModalButtonDisabled,
                  isTV && focusedItemId === 'saveServerEdit' && styles.modalOptionFocused,
                ]}
                onPress={handleSaveServer}
                disabled={savingServer}
                focusable={isTV}
                isTVSelectable={isTV}
                onFocus={isTV ? () => setFocusedItemId('saveServerEdit') : undefined}
                onBlur={isTV ? () => setFocusedItemId(null) : undefined}
              >
                {savingServer ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.serverModalButtonTextSave}>{t('settings.btnSave')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* App Language Modal */}
      <Modal visible={appLanguageModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setAppLanguageModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderWithClose}>
              <View>
                <Text style={styles.modalTitle}>{t('settings.languageTitle')}</Text>
                <Text style={styles.modalSubtitle}>{t('settings.languageSubtitle')}</Text>
              </View>
              <Pressable 
                onPress={() => setAppLanguageModal(false)} 
                style={styles.closeButton}
                focusable={isTV}
                isTVSelectable={isTV}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <ScrollView style={styles.languageScrollView}>
              <View style={styles.modalOptions}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang.code}
                    onPress={async () => {
                      await changeLanguage(lang.code);
                      setAppLanguageModal(false);
                    }}
                    style={[
                      styles.modalOption,
                      i18n.language === lang.code && styles.modalOptionActive,
                    ]}
                  >
                    <View style={styles.modalOptionContent}>
                      <Text style={[styles.modalOptionLabel, i18n.language === lang.code && styles.modalOptionLabelActive]}>
                        {lang.label}
                      </Text>
                      {i18n.language === lang.code && <Text style={styles.modalOptionSubtitle}>{t('settings.languageRestart')}</Text>}
                    </View>
                    {i18n.language === lang.code && (
                      <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Sync Loading Overlay */}
      {syncing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>{t('settings.syncOverlayTitle')}</Text>
            <Text style={styles.loadingSubText}>{t('settings.syncOverlayDesc')}</Text>
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
  settingItemFocused: {
    borderWidth: 2,
    borderColor: '#14b8a6',
    transform: [{ scale: 1.02 }],
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
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeaderWithClose: {
    padding: 20,
    paddingRight: 64, // Çarpı butonu için sağdan boşluk bırak
    minHeight: 84, // Ortalamak ve kaymayı önlemek için min height
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: 'relative',
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
    padding: 12,
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  modalOptionFocused: {
    borderColor: '#14b8a6',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
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
  // Dil seçici modal stilleri
  languageModalContent: {
    width: '60%',
    maxHeight: '80%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    zIndex: 10,
  },
  languageScrollView: {
    maxHeight: 350,
  },
});

export default SettingsScreen;
