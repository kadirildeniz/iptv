import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Çeviri dosyaları
import tr from './locales/tr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';

const LANGUAGE_STORAGE_KEY = 'app_language';

// Desteklenen diller
export const SUPPORTED_LANGUAGES = [
  { code: 'tr', label: '🇹🇷 Türkçe', nativeLabel: 'Türkçe' },
  { code: 'en', label: '🇬🇧 English', nativeLabel: 'English' },
  { code: 'de', label: '🇩🇪 Deutsch', nativeLabel: 'Deutsch' },
  { code: 'es', label: '🇪🇸 Español', nativeLabel: 'Español' },
];

// Desteklenen dil kodları
const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map(l => l.code);

/**
 * Cihaz dilini algıla ve desteklenen bir dil döndür
 */
const getDeviceLanguage = (): string => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const deviceLang = locales[0].languageCode;
      if (deviceLang && SUPPORTED_CODES.includes(deviceLang)) {
        return deviceLang;
      }
    }
  } catch (error) {
    console.warn('⚠️ Cihaz dili algılanamadı:', error);
  }
  return 'en'; // Varsayılan İngilizce
};

/**
 * Kaydedilmiş dil tercihini yükle
 */
const getSavedLanguage = async (): Promise<string | null> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('⚠️ Kaydedilmiş dil okunamadı:', error);
  }
  return null;
};

/**
 * Dil tercihini kaydet
 */
export const saveLanguage = async (langCode: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(langCode));
    console.log(`🌐 Dil kaydedildi: ${langCode}`);
  } catch (error) {
    console.error('❌ Dil kaydetme hatası:', error);
  }
};

/**
 * Dili değiştir ve kaydet
 */
export const changeLanguage = async (langCode: string): Promise<void> => {
  await i18n.changeLanguage(langCode);
  await saveLanguage(langCode);
};

/**
 * Kaydedilmiş dil tercihini getir
 */
export const getStoredLanguage = async (): Promise<string> => {
  const saved = await getSavedLanguage();
  return saved || getDeviceLanguage();
};

// i18n konfigürasyonu
i18n
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      de: { translation: de },
      es: { translation: es },
    },
    lng: getDeviceLanguage(), // Başlangıçta cihaz dili (async yükleme sonrası değişecek)
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React zaten XSS koruması sağlıyor
    },
    react: {
      useSuspense: false, // React Native'de Suspense problemlerini önle
    },
  });

// Uygulama başladığında kaydedilmiş dili yükle
(async () => {
  const savedLang = await getSavedLanguage();
  if (savedLang && savedLang !== i18n.language) {
    await i18n.changeLanguage(savedLang);
    console.log(`🌐 Kaydedilmiş dil yüklendi: ${savedLang}`);
  }
})();

export default i18n;
