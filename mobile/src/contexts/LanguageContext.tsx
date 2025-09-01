import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nManager, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage, getCurrentLanguage, isRTL, LANGUAGES } from '../locales';

interface LanguageContextType {
  currentLanguage: string;
  availableLanguages: typeof LANGUAGES;
  changeLanguage: (language: string) => Promise<void>;
  isRTL: boolean;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<string>(getCurrentLanguage());
  const [isRTLLayout, setIsRTLLayout] = useState<boolean>(isRTL());

  const changeLanguage = async (language: string) => {
    try {
      await setLanguage(language);
      setCurrentLanguage(language);
      
      const newIsRTL = language === 'ar';
      const currentRTL = I18nManager.isRTL;
      
      setIsRTLLayout(newIsRTL);
      
      // Only force RTL change if it's different from current state
      if (currentRTL !== newIsRTL) {
        I18nManager.allowRTL(newIsRTL);
        I18nManager.forceRTL(newIsRTL);
        
        // Show alert about app restart for proper RTL support
        Alert.alert(
          'Language Changed',
          'Please restart the app to fully apply the layout changes.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Note: In production, you might want to implement auto-restart
                // using react-native-restart package:
                // import RNRestart from 'react-native-restart';
                // RNRestart.Restart();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  useEffect(() => {
    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
      setIsRTLLayout(isRTL());
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const contextValue: LanguageContextType = {
    currentLanguage,
    availableLanguages: LANGUAGES,
    changeLanguage,
    isRTL: isRTLLayout,
    t,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};
