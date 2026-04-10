import { NativeModules, Platform, ToastAndroid, Alert } from 'react-native';

const { AudioBoosterModule } = NativeModules;

// ============================================================
// 🔊 AUDIO BOOSTER - LoudnessEnhancer Yardımcı Modülü
// 🔒 GÜVENLİK ÖZELLİKLERİ DAHİL
// ============================================================

// Boost Seviyeleri (mB cinsinden - milidesibel)
// 🔒 GÜVENLİK: MAX değeri +15dB'ye düşürüldü (hoparlör koruması)
export const BOOST_LEVELS = {
  NONE: 0,       // Normal - boost kapalı
  LIGHT: 400,    // Hafif Boost (+4dB) - Güvenli
  MEDIUM: 800,   // Orta Boost (+8dB) - Güvenli
  STRONG: 1200,  // Güçlü Boost (+12dB) - Dikkatli kullan
  MAX: 1500,     // Maksimum (+15dB) - ⚠️ Yüksek seviye
};

// Seviye Map'i (Ayarlardaki slider değerine göre eşleştirme)
export const getBoostLevelValue = (level: number): number => {
  if (level <= 1.0) return BOOST_LEVELS.NONE;
  if (level <= 1.5) return BOOST_LEVELS.LIGHT;
  if (level <= 2.0) return BOOST_LEVELS.MEDIUM;
  if (level <= 2.5) return BOOST_LEVELS.STRONG;
  return BOOST_LEVELS.MAX;
};

// Boost seviyesini okunabilir string'e çevir
export const getBoostLabel = (gainMB: number): string => {
  if (gainMB <= 0) return 'Kapalı';
  if (gainMB <= 400) return `+${gainMB / 100}dB (Hafif)`;
  if (gainMB <= 800) return `+${gainMB / 100}dB (Orta)`;
  if (gainMB <= 1200) return `+${gainMB / 100}dB (Güçlü)`;
  return `+${gainMB / 100}dB (Maksimum ⚠️)`;
};

// İlk kez MAX boost kullanılıyor mu takibi
let hasShownMaxWarning = false;

export const AudioBooster = {
  /**
   * Ses güçlendirme uygula
   * @param sessionId - Video player'ın audio session ID'si (0 = global)
   * @param level - Slider değeri (1.0-3.0)
   */
  setBoost: async (sessionId: number, level: number): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      console.log('🔇 AudioBooster sadece Android\'de çalışır');
      return false;
    }

    // Modül yoksa uyar
    if (!AudioBoosterModule) {
      console.warn('⚠️ AudioBoosterModule bulunamadı! Prebuild yapman gerekiyor.');
      return false;
    }

    const gainMB = getBoostLevelValue(level);
    const label = getBoostLabel(gainMB);

    // 🔒 GÜVENLİK: Maksimum boost için ilk seferinde uyarı göster
    if (gainMB >= BOOST_LEVELS.MAX && !hasShownMaxWarning) {
      hasShownMaxWarning = true;
      Alert.alert(
        '⚠️ Yüksek Ses Uyarısı',
        'Maksimum ses güçlendirme kullanıyorsunuz.\n\n' +
        '• Bazı içeriklerde ses bozulması olabilir\n' +
        '• Hoparlörlere zarar verebilir\n' +
        '• Kulaklık kullanırken dikkatli olun',
        [{ text: 'Anladım', style: 'default' }]
      );
    }

    console.log(`🔊 Audio Boost Ayarlanıyor: SessionId=${sessionId}, Level=${level}, Gain=${gainMB}mB`);

    try {
      const result = await AudioBoosterModule.setBoost(sessionId, gainMB);

      if (result === false) {
        // Modül çalışmadı - sessizce devam et
        console.warn('⚠️ Audio Boost bu cihazda desteklenmiyor');
        ToastAndroid.show('Ses boost bu cihazda desteklenmiyor', ToastAndroid.SHORT);
        return false;
      }

      console.log(`✅ Audio Boost Aktif: ${label}`);

      // Test için görsel geri bildirim (Toast)
      if (gainMB > 0) {
        ToastAndroid.show(`🔊 Ses Boost: ${label}`, ToastAndroid.SHORT);
      } else {
        ToastAndroid.show('🔇 Ses Boost Kapatıldı', ToastAndroid.SHORT);
      }

      return true;
    } catch (error) {
      console.error('❌ Audio Boost Hatası:', error);
      // Hata durumunda sessizce devam et - uygulama çökmesin
      return false;
    }
  },

  /**
   * LoudnessEnhancer'ı serbest bırak (video kapatıldığında çağır)
   */
  release: async (): Promise<void> => {
    if (Platform.OS !== 'android' || !AudioBoosterModule) return;

    try {
      await AudioBoosterModule.release();
      console.log('✅ Audio Boost Serbest Bırakıldı');
    } catch (error) {
      // Hata olsa bile sessizce devam et
      console.warn('Audio Boost release hatası (görmezden geliniyor):', error);
    }
  },

  /**
   * Modülün mevcut olup olmadığını kontrol et
   */
  isAvailable: (): boolean => {
    return Platform.OS === 'android' && !!AudioBoosterModule;
  },

  /**
   * Boost'un aktif olup olmadığını kontrol et
   */
  isEnabled: async (): Promise<boolean> => {
    if (!AudioBoosterModule) return false;
    try {
      return await AudioBoosterModule.isEnabled();
    } catch {
      return false;
    }
  },

  /**
   * Cihaz desteğini kontrol et
   */
  checkSupport: async (): Promise<{
    supported: boolean;
    apiLevel: number;
    maxSafeGain: number;
    device: string;
  } | null> => {
    if (!AudioBoosterModule) return null;
    try {
      return await AudioBoosterModule.checkSupport();
    } catch {
      return null;
    }
  },

  /**
   * Uyarı mesajını sıfırla (test için)
   */
  resetWarning: () => {
    hasShownMaxWarning = false;
  }
};
