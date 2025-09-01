import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';
import { en } from './en';

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = 'user_language';

// Available languages
export const LANGUAGES = {
  en: 'English',
};

// Resources
const resources = {
  en: { translation: en },
};

// Get device language
const getDeviceLanguage = (): string => {
  const locales = RNLocalize.getLocales();
  const deviceLanguage = locales[0]?.languageCode || 'en';
  // English only
  return 'en';
};

// Get stored language or device language
const getStoredLanguage = async (): Promise<string> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage || getDeviceLanguage();
  } catch (error) {
    console.error('Error getting stored language:', error);
    return getDeviceLanguage();
  }
};

// Store language preference
export const setLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error storing language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

// Check if current language is RTL
export const isRTL = (): boolean => {
  return false;
};

// Initialize i18n
const initI18n = async () => {
  const language = await getStoredLanguage();
  
  i18n
    .use(initReactI18next)
    .init({
      lng: language,
      fallbackLng: 'en',
      debug: __DEV__,
      resources,
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
};

// Initialize on app start
initI18n();

export default i18n;
