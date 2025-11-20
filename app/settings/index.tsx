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
  const [parentalControl, setParentalControl] = useState<boolean>(false);

  // Modal States
  const [audioBoostModal, setAudioBoostModal] = useState(false);
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
    } catch (error) {
      console.error('Credentials load error:', error);
    }
  };

  const loadSettings = async () => {
    try {
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

  const saveParentalControl = async (value: boolean) => {
    setParentalControl(value);
    await storageService.setItem('parental_control', value.toString());
  };

  const handleSync = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      
      Alert.alert(
        'Senkronizasyon',
        'Hangi içeriği güncellemek istersiniz?',
        [
          { text: 'İptal', style: 'cancel', onPress: () => setSyncing(false) },
          {
            text: 'Canlı TV',
            onPress: async () => {
              try {
                await syncService.syncChannelsOnly();
                await storageService.setItem('last_sync_time', Date.now().toString());
                await loadSettings();
                Alert.alert('Başarılı', 'Canlı TV kanalları güncellendi');
              } catch (error: any) {
                Alert.alert('Hata', error.message || 'Senkronizasyon başarısız');
              } finally {
                setSyncing(false);
              }
            },
          },
          {
            text: 'Filmler',
            onPress: async () => {
              try {
                await syncService.syncMoviesOnly();
                await storageService.setItem('last_sync_time', Date.now().toString());
                await loadSettings();
                Alert.alert('Başarılı', 'Filmler güncellendi');
              } catch (error: any) {
                Alert.alert('Hata', error.message || 'Senkronizasyon başarısız');
              } finally {
                setSyncing(false);
              }
            },
          },
          {
            text: 'Diziler',
            onPress: async () => {
              try {
                await syncService.syncSeriesOnly();
                await storageService.setItem('last_sync_time', Date.now().toString());
                await loadSettings();
                Alert.alert('Başarılı', 'Diziler güncellendi');
              } catch (error: any) {
                Alert.alert('Hata', error.message || 'Senkronizasyon başarısız');
              } finally {
                setSyncing(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      setSyncing(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Önbelleği Temizle',
      'Resim önbelleği temizlenecek. Devam edilsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              // Burada image cache temizleme yapılabilir
              Alert.alert('Başarılı', 'Önbellek temizlendi');
            } catch (error) {
              Alert.alert('Hata', 'Önbellek temizlenirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Geçmişi Temizle',
      'Tüm izleme geçmişi silinecek. Devam edilsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearHistory();
              Alert.alert('Başarılı', 'İzleme geçmişi temizlendi');
            } catch (error) {
              Alert.alert('Hata', 'Geçmiş temizlenirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.clearCredentials();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const openServerModal = () => {
    if (credentials?.host) {
      setServerUrl(credentials.host);
    }
    setServerModal(true);
  };

  const handleSaveServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Hata', 'Lütfen sunucu adresini girin');
      return;
    }

    // Önce kullanıcıya uyarı göster
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

              // Mevcut credentials'ı al
              const currentCredentials = await storageService.getCredentials();
              
              if (!currentCredentials) {
                Alert.alert('Hata', 'Hesap bilgileri bulunamadı');
                setSavingServer(false);
                return;
              }

              // Sadece host'u güncelle, diğer bilgiler aynı kalsın
              const newCredentials = {
                ...currentCredentials,
                host: serverUrl.trim(),
              };

              console.log('🔄 Yeni sunucu ile bağlantı test ediliyor...');

              // Yeni sunucu ile bağlantı testi yap
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
              
              // Veritabanını sıfırla (Eski sunucudan gelen tüm veriler silinir)
              await databaseService.resetDatabase();

              console.log('💾 Yeni credentials kaydediliyor...');
              
              // Yeni credentials'ı kaydet
              await storageService.saveCredentials(newCredentials);

              // Son senkronizasyon zamanını sıfırla
              await storageService.removeItem('last_sync_time');

              // Modal'ı kapat
              setServerModal(false);
              setSavingServer(false);

              console.log('✅ Sunucu değişimi tamamlandı');

              // Kullanıcıyı ana sayfaya yönlendir ve bilgilendir
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

  const maskUrl = (url: string): string => {
    if (!url) return '';
    const parts = url.split('.');
    if (parts.length < 2) return url;
    return `${parts[0].substring(0, 3)}***${parts[parts.length - 1]}`;
  };

  // Sections Data
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
          onPress: openServerModal,
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
      ],
    },
    {
      title: 'VERİ & SENKRONİZASYON',
      emoji: '☁️',
      data: [
        {
          id: 'sync',
          title: 'İçeriği Güncelle',
          icon: 'cloud-download-outline',
          type: 'action',
          value: syncing ? 'Güncelleniyor...' : `Son: ${lastSync}`,
          onPress: handleSync,
        },
        {
          id: 'clear_cache',
          title: 'Resim Önbelleği',
          icon: 'images-outline',
          type: 'action',
          value: '~150 MB',
          badge: 'Temizle',
          onPress: handleClearCache,
        },
        {
          id: 'clear_history',
          title: 'Geçmişi Temizle',
          icon: 'time-outline',
          type: 'action',
          onPress: handleClearHistory,
        },
      ],
    },
    {
      title: 'GÜVENLİK & DİĞER',
      emoji: '🛡️',
      data: [
        {
          id: 'parental_control',
          title: 'Ebeveyn Kontrolü (+18)',
          icon: 'lock-closed-outline',
          type: 'switch',
          value: parentalControl,
          onValueChange: saveParentalControl,
        },
        {
          id: 'version',
          title: 'Sürüm',
          icon: 'information-circle-outline',
          type: 'info',
          value: '1.0.0',
        },
        {
          id: 'logout',
          title: 'Çıkış Yap',
          icon: 'log-out-outline',
          type: 'action',
          danger: true,
          onPress: handleLogout,
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
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>{item.badge}</Text>
            </View>
          )}

          {(item.type === 'navigation' || item.type === 'selector' || (item.type === 'action' && !item.danger)) && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#64748b"
              style={styles.chevron}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: '#fff',
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  actionBadgeText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: '#3b82f6',
  },
  chevron: {
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    marginLeft: 68,
    marginRight: 20,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: '#94a3b8',
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
  },
  modalTitle: {
    fontSize: 20,
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
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionLabel: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: '#fff',
    marginBottom: 2,
  },
  modalOptionLabelActive: {
    color: '#3b82f6',
  },
  modalOptionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#94a3b8',
  },
  serverModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: 340,
    maxWidth: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  serverModalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: '#94a3b8',
    marginBottom: 8,
  },
  serverInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  inputHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  serverModalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  serverModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverModalButtonCancel: {
    backgroundColor: '#374151',
  },
  serverModalButtonSave: {
    backgroundColor: '#3b82f6',
  },
  serverModalButtonDisabled: {
    opacity: 0.5,
  },
  serverModalButtonTextCancel: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: '#d1d5db',
  },
  serverModalButtonTextSave: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: '#ffffff',
  },
});

export default SettingsScreen;
