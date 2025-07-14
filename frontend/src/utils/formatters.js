import dayjs from 'dayjs';
import { useLanguage } from '../contexts/LanguageContext';

// Number formatting utilities
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'USD' ? '$0.00' : '0.00';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (number, locale = 'en-US', options = {}) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }).format(number);
};

export const formatPercentage = (value, locale = 'en-US', decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

// Date formatting utilities
export const formatDate = (date, format = 'YYYY-MM-DD', locale = 'en') => {
  if (!date) return '';
  
  const d = dayjs(date);
  if (!d.isValid()) return '';
  
  // Use different formats based on locale
  if (locale === 'ar') {
    switch (format) {
      case 'full':
        return d.format('dddd، DD MMMM YYYY');
      case 'short':
        return d.format('DD/MM/YYYY');
      case 'time':
        return d.format('HH:mm');
      case 'datetime':
        return d.format('DD/MM/YYYY HH:mm');
      default:
        return d.format(format);
    }
  } else {
    switch (format) {
      case 'full':
        return d.format('dddd, MMMM DD, YYYY');
      case 'short':
        return d.format('MM/DD/YYYY');
      case 'time':
        return d.format('HH:mm');
      case 'datetime':
        return d.format('MM/DD/YYYY HH:mm');
      default:
        return d.format(format);
    }
  }
};

export const formatRelativeTime = (date, locale = 'en') => {
  if (!date) return '';
  
  const d = dayjs(date);
  if (!d.isValid()) return '';
  
  return d.fromNow();
};

// React hook for formatting based on current language
export const useFormatters = () => {
  const { language } = useLanguage();
  
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  const currency = 'USD'; // You can make this configurable
  
  return {
    formatCurrency: (amount) => formatCurrency(amount, currency, locale),
    formatNumber: (number, options = {}) => formatNumber(number, locale, options),
    formatPercentage: (value, decimals = 1) => formatPercentage(value, locale, decimals),
    formatDate: (date, format = 'YYYY-MM-DD') => formatDate(date, format, language),
    formatRelativeTime: (date) => formatRelativeTime(date, language),
    
    // Compact number formatting for large numbers
    formatCompactNumber: (number) => {
      if (number === null || number === undefined || isNaN(number)) {
        return '0';
      }
      
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short'
      }).format(number);
    },
    
    // Format numbers with custom suffixes
    formatNumberWithSuffix: (number) => {
      if (number === null || number === undefined || isNaN(number)) {
        return '0';
      }
      
      const absNumber = Math.abs(number);
      
      if (absNumber >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
      } else if (absNumber >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
      }
      
      return formatNumber(number, locale);
    }
  };
};

// Chart data formatters
export const formatChartData = (data, xField, yField, locale = 'en-US') => {
  return data.map(item => ({
    ...item,
    [xField]: typeof item[xField] === 'string' && dayjs(item[xField]).isValid() 
      ? formatDate(item[xField], 'short', locale.split('-')[0])
      : item[xField],
    [yField]: typeof item[yField] === 'number' 
      ? formatNumber(item[yField], locale)
      : item[yField]
  }));
};

// Table column formatters
export const createCurrencyColumn = (title, dataIndex, locale = 'en-US', currency = 'USD') => ({
  title,
  dataIndex,
  key: dataIndex,
  render: (value) => formatCurrency(value, currency, locale),
  sorter: (a, b) => (a[dataIndex] || 0) - (b[dataIndex] || 0),
});

export const createNumberColumn = (title, dataIndex, locale = 'en-US', options = {}) => ({
  title,
  dataIndex,
  key: dataIndex,
  render: (value) => formatNumber(value, locale, options),
  sorter: (a, b) => (a[dataIndex] || 0) - (b[dataIndex] || 0),
});

export const createDateColumn = (title, dataIndex, format = 'short', locale = 'en') => ({
  title,
  dataIndex,
  key: dataIndex,
  render: (value) => formatDate(value, format, locale),
  sorter: (a, b) => dayjs(a[dataIndex]).unix() - dayjs(b[dataIndex]).unix(),
});

export default {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatRelativeTime,
  formatChartData,
  createCurrencyColumn,
  createNumberColumn,
  createDateColumn,
  useFormatters
};
