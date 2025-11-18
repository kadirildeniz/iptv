import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { storageService, authService } from '@/services';
import { fonts } from '@/theme/fonts';

interface Settings {
  theme: 'light' | 'dark';
  language: 'tr' | 'en';
  autoplay: boolean;
  defaultQuality: 'auto' | '1080p' | '720p' | '480p';
  subtitleEnabled: boolean;
  ageRestriction: boolean;
  autoPlayNextEpisode: boolean;
  cacheSize: 'small' | 'medium' | 'large';
  networkOptimization: boolean;
  dataSaver: boolean;
  autoQuality: boolean;
}

const Settings: React.FC = () => {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    language: 'tr',
    autoplay: true,
    defaultQuality: 'auto',
    subtitleEnabled: false,
    ageRestriction: false,
    autoPlayNextEpisode: true,
    cacheSize: 'medium',
    networkOptimization: true,
    dataSaver: false,
    autoQuality: true,
  });
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState({
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
  });
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await loadSettings();
      await loadCredentials();
      await loadAccountInfo();
    };
    initialize();
  }, []);

  useEffect(() => {
    // Account info yüklendikten sonra credentials'ı güncelle
    if (accountInfo && credentials) {
      setEditingCredentials({
        name: accountInfo?.user_info?.username || credentials.username || '',
        host: credentials.host || '',
        port: credentials.port || '',
        username: credentials.username || '',
        password: credentials.password || '',
      });
    }
  }, [accountInfo, credentials]);

  const loadSettings = async () => {
    try {
      const savedSettings = await storageService.getSettings();
      if (savedSettings) {
        setSettings({ ...settings, ...savedSettings });
      }
    } catch (error) {
      console.error('Settings load error:', error);
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

  const handleUpdateCredentials = async () => {
    if (!editingCredentials.host || !editingCredentials.username || !editingCredentials.password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setIsSavingCredentials(true);
      
      // Yeni credentials ile giriş yap
      const newCredentials = {
        host: editingCredentials.host.trim(),
        port: editingCredentials.port.trim() || '8080',
        username: editingCredentials.username.trim(),
        password: editingCredentials.password.trim(),
      };

      // API ile doğrula
      const accountInfo = await authService.login(newCredentials);
      
      // Başarılıysa kaydet
      await storageService.saveCredentials(newCredentials);
      setCredentials(newCredentials);
      setAccountInfo(accountInfo);
      
      Alert.alert('Başarılı', 'Hesap bilgileri güncellendi');
      setShowAccountModal(false);
    } catch (error: any) {
      console.error('Update credentials error:', error);
      Alert.alert('Hata', error.message || 'Hesap bilgileri güncellenirken bir hata oluştu');
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const openAccountModal = () => {
    if (credentials) {
      setEditingCredentials({
        name: accountInfo?.user_info?.username || credentials.username || '',
        host: credentials.host || '',
        port: credentials.port || '',
        username: credentials.username || '',
        password: credentials.password || '',
      });
    }
    setShowAccountModal(true);
  };

  const saveSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await storageService.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Settings save error:', error);
      Alert.alert('Hata', 'Ayarlar kaydedilirken bir hata oluştu');
    }
  };

  const handleLogout = async () => {
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
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const clearCache = async () => {
    Alert.alert(
      'Önbelleği Temizle',
      'Tüm önbellek verileri silinecek. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              // İzleme geçmişini temizle
              await storageService.clearHistory();
              Alert.alert('Başarılı', 'Önbellek temizlendi');
            } catch (error) {
              console.error('Cache clear error:', error);
              Alert.alert('Hata', 'Önbellek temizlenirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e90ff" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Ayarlar kartları için veri
  const settingsCards = [
    {
      id: 'account',
      title: 'Hesap',
      icon: '👤',
      color: '#1e90ff',
      onPress: openAccountModal,
      content: (
        <View style={styles.cardContent}>
          {accountInfo?.user_info && (
            <Text style={styles.cardText} numberOfLines={1}>
              {accountInfo.user_info.username}
            </Text>
          )}
          {accountInfo?.user_info && (
            <Text style={styles.cardSubtext}>
              {accountInfo.user_info.status === 'Active' ? '✅ Aktif' : '❌ Pasif'}
            </Text>
          )}
          {credentials && (
            <Text style={styles.cardSubtext} numberOfLines={1}>
              {credentials.host}:{credentials.port}
            </Text>
          )}
        </View>
      ),
    },
    {
      id: 'appearance',
      title: 'Görünüm',
      icon: '🎨',
      color: '#9b59b6',
      onPress: () => {
        // Görünüm ayarları
      },
      content: (
        <View style={styles.cardContent}>
          <Text style={styles.cardText}>Karanlık Tema</Text>
          <Switch
            value={settings.theme === 'dark'}
            onValueChange={(value) => saveSettings({ theme: value ? 'dark' : 'light' })}
            trackColor={{ false: '#767577', true: '#9b59b6' }}
            thumbColor={settings.theme === 'dark' ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      ),
    },
    {
      id: 'video',
      title: 'Video Oynatıcı',
      icon: '▶️',
      color: '#e74c3c',
      onPress: () => {
        // Video ayarları
      },
      content: (
        <View style={styles.cardContent}>
          <View style={styles.settingItem}>
            <Text style={styles.cardText}>Otomatik Oynatma</Text>
            <Switch
              value={settings.autoplay}
              onValueChange={(value) => saveSettings({ autoplay: value })}
              trackColor={{ false: '#767577', true: '#e74c3c' }}
              thumbColor={settings.autoplay ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.cardText}>Alt Yazılar</Text>
            <Switch
              value={settings.subtitleEnabled}
              onValueChange={(value) => saveSettings({ subtitleEnabled: value })}
              trackColor={{ false: '#767577', true: '#e74c3c' }}
              thumbColor={settings.subtitleEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.cardText}>Sonraki Bölüm</Text>
            <Switch
              value={settings.autoPlayNextEpisode}
              onValueChange={(value) => saveSettings({ autoPlayNextEpisode: value })}
              trackColor={{ false: '#767577', true: '#e74c3c' }}
              thumbColor={settings.autoPlayNextEpisode ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>
      ),
    },
    {
      id: 'performance',
      title: 'Performans',
      icon: '⚡',
      color: '#f39c12',
      onPress: () => {
        // Performans ayarları
      },
      content: (
        <View style={styles.cardContent}>
          <View style={styles.settingItem}>
            <Text style={styles.cardText}>Ağ Optimizasyonu</Text>
            <Switch
              value={settings.networkOptimization}
              onValueChange={(value) => saveSettings({ networkOptimization: value })}
              trackColor={{ false: '#767577', true: '#f39c12' }}
              thumbColor={settings.networkOptimization ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.cardText}>Veri Tasarrufu</Text>
            <Switch
              value={settings.dataSaver}
              onValueChange={(value) => saveSettings({ dataSaver: value })}
              trackColor={{ false: '#767577', true: '#f39c12' }}
              thumbColor={settings.dataSaver ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.cardText}>Otomatik Kalite</Text>
            <Switch
              value={settings.autoQuality}
              onValueChange={(value) => saveSettings({ autoQuality: value })}
              trackColor={{ false: '#767577', true: '#f39c12' }}
              thumbColor={settings.autoQuality ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>
      ),
    },
    {
      id: 'content',
      title: 'İçerik',
      icon: '📺',
      color: '#2ecc71',
      onPress: () => {
        // İçerik ayarları
      },
      content: (
        <View style={styles.cardContent}>
          <Text style={styles.cardText}>Yaş Sınırı</Text>
          <Switch
            value={settings.ageRestriction}
            onValueChange={(value) => saveSettings({ ageRestriction: value })}
            trackColor={{ false: '#767577', true: '#2ecc71' }}
            thumbColor={settings.ageRestriction ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      ),
    },
    {
      id: 'data',
      title: 'Veri Yönetimi',
      icon: '💾',
      color: '#3498db',
      onPress: () => {
        // Veri yönetimi
      },
      content: (
        <View style={styles.cardContent}>
          <TouchableOpacity onPress={clearCache} style={styles.cardAction}>
            <Text style={styles.cardActionText}>Önbelleği Temizle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardAction}
            onPress={() => router.push('/settings/favorites')}
          >
            <Text style={styles.cardActionText}>Favorileri Yönet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardAction}
            onPress={() => router.push('/settings/history')}
          >
            <Text style={styles.cardActionText}>İzleme Geçmişi</Text>
          </TouchableOpacity>
        </View>
      ),
    },
    {
      id: 'logout',
      title: 'Çıkış Yap',
      icon: '🚪',
      color: '#e74c3c',
      onPress: handleLogout,
      content: (
        <View style={styles.cardContent}>
          <Text style={styles.cardText}>Hesaptan çıkış yap</Text>
        </View>
      ),
    },
    {
      id: 'about',
      title: 'Uygulama',
      icon: 'ℹ️',
      color: '#95a5a6',
      onPress: () => {
        Alert.alert('IPTV Uygulaması', 'Versiyon: 1.0.0\n\nIPTV içeriklerini izlemek için geliştirilmiştir.');
      },
      content: (
        <View style={styles.cardContent}>
          <Text style={styles.cardText}>Versiyon 1.0.0</Text>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Ayarlar</Text>
        </View>

        {/* Grid Layout - 4'lü kutu */}
        <View style={styles.gridContainer}>
          {settingsCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[styles.card, { borderLeftColor: card.color }]}
              onPress={card.onPress}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <Text style={styles.cardTitle}>{card.title}</Text>
              </View>
              {card.content}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer} />
      </ScrollView>

      {/* Hesap Düzenleme Modal */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hesap Bilgileri</Text>
              <TouchableOpacity
                onPress={() => setShowAccountModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ad</Text>
                <TextInput
                  style={styles.input}
                  value={editingCredentials.name}
                  onChangeText={(text) => setEditingCredentials({ ...editingCredentials, name: text })}
                  placeholder="Adınız"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>URL (Host)</Text>
                <TextInput
                  style={styles.input}
                  value={editingCredentials.host}
                  onChangeText={(text) => setEditingCredentials({ ...editingCredentials, host: text })}
                  placeholder="örn: zunexle.live"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Port</Text>
                <TextInput
                  style={styles.input}
                  value={editingCredentials.port}
                  onChangeText={(text) => setEditingCredentials({ ...editingCredentials, port: text })}
                  placeholder="örn: 8080"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kullanıcı Adı</Text>
                <TextInput
                  style={styles.input}
                  value={editingCredentials.username}
                  onChangeText={(text) => setEditingCredentials({ ...editingCredentials, username: text })}
                  placeholder="Kullanıcı adı"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Şifre</Text>
                <TextInput
                  style={styles.input}
                  value={editingCredentials.password}
                  onChangeText={(text) => setEditingCredentials({ ...editingCredentials, password: text })}
                  placeholder="Şifre"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSavingCredentials && styles.saveButtonDisabled]}
                onPress={handleUpdateCredentials}
                disabled={isSavingCredentials}
              >
                {isSavingCredentials ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Güncelle</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
    ...(Platform.OS === 'web' && {
      background: 'linear-gradient(135deg, #0d1b2a 0%, #1e3a8a 50%, #0d1b2a 100%)',
    }),
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 40 : 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: fonts.bold,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 20,
    ...(Platform.OS === 'web' && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  card: {
    width: Platform.OS === 'web' ? '23%' : '47%',
    backgroundColor: 'rgba(13, 27, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    margin: Platform.OS === 'web' ? '1%' : '1.5%',
    borderWidth: 2,
    borderLeftWidth: 4,
    borderColor: 'rgba(30, 144, 255, 0.2)',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === 'web' && {
      minWidth: 200,
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    fontFamily: fonts.bold,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
    marginRight: 8,
    fontFamily: fonts.regular,
  },
  cardSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: fonts.regular,
  },
  cardAction: {
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  cardActionText: {
    fontSize: 12,
    color: '#1e90ff',
    fontWeight: '600',
    fontFamily: fonts.semibold,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
    fontFamily: fonts.semibold,
  },
  footer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 144, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: fonts.bold,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#93c5fd',
    marginBottom: 8,
    fontFamily: fonts.semibold,
  },
  input: {
    backgroundColor: 'rgba(13, 27, 42, 0.6)',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
    fontFamily: fonts.regular,
  },
  saveButton: {
    backgroundColor: '#1e90ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 20,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});

export default Settings;

