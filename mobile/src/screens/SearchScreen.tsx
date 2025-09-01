import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/Ionicons';

interface SearchScreenProps {
  navigation: any;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.rtlContainer]}>
      <View style={[styles.header, isRTL && styles.rtlHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="#333" />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.rtlText]}>
          {t('common.search')}
        </Text>
      </View>

      <View style={styles.content}>
        <Icon name="search-outline" size={64} color="#ccc" />
        <Text style={[styles.message, isRTL && styles.rtlText]}>
          Search Screen
        </Text>
        <Text style={[styles.subMessage, isRTL && styles.rtlText]}>
          This screen will be implemented soon
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  rtlContainer: {
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  rtlHeader: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    marginLeft: 0,
    marginRight: 15,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 18,
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
});

export default SearchScreen;
