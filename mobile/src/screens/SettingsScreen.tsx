import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { t, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

  // Language selection is disabled (English only)
  const handleLanguageChange = (_languageCode: string) => {};

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('settings.logoutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(t('common.error'), t('settings.logoutError'));
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightComponent?: React.ReactNode,
    showArrow: boolean = true
  ) => (
    <TouchableOpacity 
      style={[styles.settingItem, isRTL && styles.rtlSettingItem]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingContent, isRTL && styles.rtlSettingContent]}>
        <Text style={[styles.settingTitle, isRTL && styles.rtlText]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, isRTL && styles.rtlText]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightComponent && (
        <View style={styles.settingRight}>
          {rightComponent}
        </View>
      )}
      {showArrow && !rightComponent && (
        <Text style={[styles.arrow, isRTL && styles.rtlArrow]}>›</Text>
      )}
    </TouchableOpacity>
  );

  const renderLanguageSelector = () => null;

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.rtlContainer]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={[styles.header, isRTL && styles.rtlHeader]}>
        <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {t('navigation.settings')}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('settings.account')}
          </Text>
          {renderSettingItem(
            t('profile.personalInfo'),
            'Manage your personal information'
          )}
          {renderSettingItem(
            t('profile.address'),
            'Manage delivery addresses'
          )}
          {renderSettingItem(
            t('profile.paymentMethods'),
            'Manage payment methods'
          )}
          {renderSettingItem(
            t('settings.security'),
            'Password and security settings'
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('profile.preferences')}
          </Text>
          
          {/* Language Settings */}
          {renderLanguageSelector()}
          
          {renderSettingItem(
            t('settings.notifications'),
            'Manage notification preferences',
            undefined,
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />,
            false
          )}
          
          {renderSettingItem(
            t('settings.theme'),
            'Dark mode',
            undefined,
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
            />,
            false
          )}
          
          {renderSettingItem(
            t('settings.currency'),
            'USD - US Dollar'
          )}
        </View>

        {/* Development Section */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              Development
            </Text>
            {renderSettingItem(
              'Notification Test',
              'Test push notifications',
              () => navigation.navigate('NotificationTest')
            )}
          </View>
        )}

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('settings.helpSupport')}
          </Text>
          {renderSettingItem(
            'Help Center',
            'Get help and support'
          )}
          {renderSettingItem(
            'Contact Us',
            'Get in touch with our team'
          )}
          {renderSettingItem(
            'About Qabalan Bakery',
            'Learn more about us',
            () => navigation.navigate('About')
          )}
          {renderSettingItem(
            'Rate App',
            'Rate us on the app store'
          )}
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            Legal
          </Text>
          {renderSettingItem(
            t('settings.termsConditions'),
            'Read our terms and conditions'
          )}
          {renderSettingItem(
            t('settings.privacyPolicy'),
            'Read our privacy policy'
          )}
          {renderSettingItem(
            'Licenses',
            'Third-party licenses'
          )}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('settings.about')}
          </Text>
          {renderSettingItem(
            t('profile.version'),
            '1.0.0',
            undefined,
            undefined,
            false
          )}
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={[styles.logoutText, isRTL && styles.rtlText]}>
              {t('auth.logout')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  rtlHeader: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 10,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e9ecef',
  },
  rtlSettingItem: {
    flexDirection: 'row-reverse',
  },
  settingContent: {
    flex: 1,
  },
  rtlSettingContent: {
    alignItems: 'flex-end',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingRight: {
    marginLeft: 10,
  },
  arrow: {
    fontSize: 18,
    color: '#ccc',
    marginLeft: 10,
  },
  rtlArrow: {
    transform: [{ rotate: '180deg' }],
    marginLeft: 0,
    marginRight: 10,
  },
  languageSelector: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  rtlLanguageSelector: {
    alignItems: 'flex-end',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  rtlLanguageOption: {
    flexDirection: 'row-reverse',
  },
  selectedLanguage: {
    backgroundColor: '#007bff',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
  },
  selectedLanguageText: {
    color: '#fff',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  rtlCheckmark: {
    marginRight: 0,
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
