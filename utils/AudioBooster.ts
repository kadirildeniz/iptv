import { NativeModules, Platform } from 'react-native';

const { AudioBoosterModule } = NativeModules;

// Boost Seviyeleri (mB cinsinden)
// 1000mB = 10dB
export const BOOST_LEVELS = {
  NONE: 0,       // Normal
  LIGHT: 500,    // Hafif Boost (+5dB)
  STRONG: 1200,  // Güçlü Boost (+12dB)
  MAX: 2000,     // Maksimum (+20dB)
};

// Seviye Map'i (Ayarlardaki değere göre eşleştirme)
export const getBoostLevelValue = (level: number): number => {
  if (level <= 1.0) return BOOST_LEVELS.NONE;
  if (level <= 1.5) return BOOST_LEVELS.LIGHT;
  if (level <= 2.0) return BOOST_LEVELS.STRONG;
  return BOOST_LEVELS.MAX;
};

export const AudioBooster = {
  setBoost: (sessionId: number, level: number) => {
    if (Platform.OS !== 'android') return;
    
    // Eğer modül yoksa (henüz build alınmadıysa) hata vermesin
    if (!AudioBoosterModule) {
      console.warn('AudioBoosterModule not found. Please rebuild the app.');
      return;
    }

    const boostValue = getBoostLevelValue(level);
    console.log(`🔊 Audio Boost Ayarlanıyor: SessionId=${sessionId}, Level=${level}, Gain=${boostValue}mB`);
    
    AudioBoosterModule.setBoost(sessionId, boostValue);
  },

  release: () => {
    if (Platform.OS !== 'android' || !AudioBoosterModule) return;
    AudioBoosterModule.release();
  }
};

