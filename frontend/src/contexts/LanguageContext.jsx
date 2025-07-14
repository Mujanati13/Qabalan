import { createContext, useContext, useState, useEffect } from 'react'
import { ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import arEG from 'antd/locale/ar_EG'
import { translations } from '../locales'

const LanguageContext = createContext({})

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('admin_language') || 'en'
  })

  const [direction, setDirection] = useState(language === 'ar' ? 'rtl' : 'ltr')

  useEffect(() => {
    // Update document direction
    document.documentElement.dir = direction
    document.documentElement.lang = language
    
    // Store language preference
    localStorage.setItem('admin_language', language)
  }, [language, direction])

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage)
    setDirection(newLanguage === 'ar' ? 'rtl' : 'ltr')
  }

  const t = (key) => {
    // Support nested keys like "common.loading"
    const keys = key.split('.')
    let result = translations[language]
    
    for (const k of keys) {
      result = result?.[k]
      if (result === undefined) break
    }
    
    return result || key
  }

  const getAntdLocale = () => {
    return language === 'ar' ? arEG : enUS
  }

  const value = {
    language,
    direction,
    changeLanguage,
    t,
    isRTL: direction === 'rtl'
  }

  return (
    <LanguageContext.Provider value={value}>
      <ConfigProvider locale={getAntdLocale()} direction={direction}>
        {children}
      </ConfigProvider>
    </LanguageContext.Provider>
  )
}
