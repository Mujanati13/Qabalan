import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../contexts/TranslationContext';

const LanguageSwitcher = ({ style = {}, size = 'default', showIcon = true }) => {
  const { settings, currentLanguage, switchLanguage } = useSettings();
  const { t } = useTranslation();

  // Don't render if multi-language is disabled
  if (!settings.languages?.enableMultiLanguage) {
    return null;
  }

  const availableLanguages = settings.languages?.availableLanguages || ['en'];
  const showFlags = settings.languages?.showLanguageFlags;

  // Don't render if only one language is available
  if (availableLanguages.length <= 1) {
    return null;
  }

  const languageOptions = [
    {
      code: 'en',
      name: 'English',
      flag: '🇺🇸',
      nativeName: 'EN'
    },
    {
      code: 'ar',
      name: 'Arabic',
      flag: '🇸🇦',
      nativeName: 'عربي'
    }
  ];

  const handleLanguageToggle = () => {
    const currentIndex = availableLanguages.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % availableLanguages.length;
    const nextLanguage = availableLanguages[nextIndex];
    switchLanguage(nextLanguage);
  };

  const getCurrentLanguageData = () => {
    return languageOptions.find(lang => lang.code === currentLanguage) || languageOptions[0];
  };

  const getNextLanguageData = () => {
    const currentIndex = availableLanguages.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % availableLanguages.length;
    const nextLanguage = availableLanguages[nextIndex];
    return languageOptions.find(lang => lang.code === nextLanguage) || languageOptions[0];
  };

  return (
    <div style={style}>
      <Tooltip 
        title={`${t('general.language')}: ${t('general.switchTo', 'Switch to')} ${getNextLanguageData().name}`}
        placement="bottom"
      >
        <Button
          type="text"
          size={size}
          onClick={handleLanguageToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            height: 'auto',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '6px',
            transition: 'all 0.3s ease',
            ...style
          }}
          className="language-switcher-btn"
        >
          <Space size="small" align="center">
            {showIcon && <GlobalOutlined style={{ fontSize: '14px' }} />}
            {showFlags && (
              <span style={{ fontSize: '16px', lineHeight: 1 }}>
                {getCurrentLanguageData().flag}
              </span>
            )}
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '500',
              minWidth: '24px',
              textAlign: 'center'
            }}>
              {getCurrentLanguageData().nativeName}
            </span>
          </Space>
        </Button>
      </Tooltip>
    </div>
  );
};

export default LanguageSwitcher;
