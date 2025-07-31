import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    // Default values
    app_config: {
      siteName: 'Qabalan',
      primaryColor: '#229A95',
      showOffers: true,
      showProducts: true,
      headerStyle: 'modern',
      footerText: '© 2025 Qabalan. All rights reserved.'
    },
    theme: {
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: 12,
      backgroundStyle: 'solid',
      cardShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
      customCSS: '',
      animationSpeed: 0.3
    },
    home_page: {
      heroTitle: 'Welcome to Qabalan',
      heroSubtitle: 'Discover amazing products and exclusive offers',
      showFeaturedProducts: true,
      showFeaturedOffers: true,
      showCategories: true,
      maxFeaturedProducts: 8,
      maxFeaturedOffers: 6
    },
    locations: {
      enableMap: false,
      mapProvider: 'google',
      mapApiKey: '',
      showAllBranches: true,
      defaultZoom: 12,
      mapHeight: 400,
      enableDirections: true
    },
    languages: {
      enableMultiLanguage: true,
      defaultLanguage: 'en',
      availableLanguages: ['en', 'ar'],
      showLanguageFlags: true,
      languageSwitcherPosition: 'header'
    },
    contact: {
      enableContactPage: false,
      primaryPhone: '',
      primaryEmail: '',
      whatsappNumber: '',
      address: '',
      enableContactForm: false,
      formRecipientEmail: '',
      businessHours: '',
      facebookUrl: '',
      instagramUrl: '',
      twitterUrl: '',
      linkedinUrl: ''
    }
  });

  const [loading, setLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Get saved language from localStorage or default to 'en'
    return localStorage.getItem('selectedLanguage') || 'en';
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/settings/public`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const formattedSettings = {};
          
          // Group settings by category
          Object.entries(data.data).forEach(([category, categorySettings]) => {
            formattedSettings[category] = {};
            categorySettings.forEach(setting => {
              let value = setting.setting_value;
              
              // Convert string booleans to actual booleans
              if (value === 'true') value = true;
              if (value === 'false') value = false;
              // Convert string numbers to actual numbers
              if (!isNaN(value) && value !== '' && value !== null) {
                const numValue = Number(value);
                if (!isNaN(numValue)) value = numValue;
              }
              // Handle arrays (for multi-select values)
              if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
                try {
                  value = JSON.parse(value);
                } catch (e) {
                  // Keep as string if JSON parsing fails
                }
              }
              
              formattedSettings[category][setting.setting_key] = value;
            });
          });
          
          // Merge with defaults to ensure all settings exist
          setSettings(prevSettings => {
            const mergedSettings = { ...prevSettings };
            Object.keys(formattedSettings).forEach(category => {
              mergedSettings[category] = {
                ...prevSettings[category],
                ...formattedSettings[category]
              };
            });
            return mergedSettings;
          });

          // Set default language if multi-language is enabled
          if (formattedSettings.languages?.enableMultiLanguage) {
            const savedLanguage = localStorage.getItem('selectedLanguage');
            const defaultLang = formattedSettings.languages?.defaultLanguage || 'en';
            const availableLanguages = formattedSettings.languages?.availableLanguages || ['en'];
            
            // Use saved language if it's available, otherwise use default
            if (savedLanguage && availableLanguages.includes(savedLanguage)) {
              setCurrentLanguage(savedLanguage);
            } else if (availableLanguages.includes(defaultLang)) {
              setCurrentLanguage(defaultLang);
              localStorage.setItem('selectedLanguage', defaultLang);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      message.error('Failed to load website configuration');
    } finally {
      setLoading(false);
    }
  };

  const getSetting = (category, key, defaultValue = null) => {
    return settings[category]?.[key] ?? defaultValue;
  };

  const getThemeConfig = () => {
    const themeSettings = settings.theme;
    const appSettings = settings.app_config;
    
    return {
      token: {
        colorPrimary: appSettings.primaryColor || '#229A95',
        colorSuccess: '#10b981',
        colorWarning: '#f59e0b',
        colorError: '#ef4444',
        colorInfo: appSettings.primaryColor || '#229A95',
        borderRadius: themeSettings.borderRadius || 12,
        fontFamily: themeSettings.fontFamily || 'Inter, system-ui, sans-serif',
        colorBgContainer: '#ffffff',
        colorBgLayout: '#f8fafc',
      },
      components: {
        Button: {
          borderRadius: themeSettings.borderRadius || 12,
          controlHeight: 44,
          fontWeight: 600,
          primaryShadow: `0 4px 12px ${appSettings.primaryColor || '#229A95'}33`,
        },
        Card: {
          borderRadius: (themeSettings.borderRadius || 12) + 4,
          boxShadow: themeSettings.cardShadow || '0 4px 24px rgba(0, 0, 0, 0.06)',
        },
        Input: {
          borderRadius: themeSettings.borderRadius || 12,
          controlHeight: 44,
        },
        Layout: {
          headerBg: '#ffffff',
          siderBg: '#ffffff',
        },
      },
    };
  };

  const switchLanguage = (langCode) => {
    if (settings.languages?.availableLanguages?.includes(langCode)) {
      setCurrentLanguage(langCode);
      localStorage.setItem('selectedLanguage', langCode);
      
      // Update document language and direction
      document.documentElement.lang = langCode;
      document.documentElement.dir = langCode === 'ar' ? 'rtl' : 'ltr';
      
      // Force a re-render of components that depend on language
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: langCode } }));
    }
  };

  const value = {
    settings,
    loading,
    currentLanguage,
    getSetting,
    getThemeConfig,
    switchLanguage,
    fetchSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
