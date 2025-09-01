import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import apiService, { User } from '../services/apiService';

interface EditProfileScreenProps {
  navigation: any;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user: authUser, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    notification_promo: true,
    notification_orders: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authUser) {
      setFormData({
        first_name: authUser.first_name || '',
        last_name: authUser.last_name || '',
        email: authUser.email || '',
        phone: authUser.phone || '',
        birth_date: authUser.birth_date || '',
        notification_promo: authUser.notification_promo ?? true,
        notification_orders: authUser.notification_orders ?? true,
      });
    }
  }, [authUser]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = t('auth.firstNameRequired');
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = t('auth.lastNameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.invalidEmail');
    }

    // Improved phone validation to match backend
    if (formData.phone && formData.phone.trim()) {
      // Remove spaces, dashes, and parentheses for validation
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, '');
      if (!/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
        newErrors.phone = t('auth.invalidPhone');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Prepare data for backend - clean phone number
      const updateData = {
        ...formData,
        phone: formData.phone ? formData.phone.replace(/[\s\-()]/g, '') : formData.phone
      };

      const response = await apiService.updateUserProfile(updateData);
      
      if (response.success && response.data) {
        // Update auth context with new user data
        updateUser(response.data);
        
        Alert.alert(
          t('common.success'),
          t('profile.profileUpdated'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      // Handle specific errors
      if (error.message?.includes('email') || error.message?.includes('Email')) {
        setErrors({ email: t('profile.emailInUse') });
      } else if (error.message?.includes('phone') || error.message?.includes('Phone')) {
        setErrors({ phone: t('profile.phoneInUse') });
      } else if (error.message?.includes('Validation failed')) {
        // Log detailed validation errors
        console.error('Validation failed details:', error);
        Alert.alert(
          t('common.error'), 
          t('profile.validationError') || 'Please check your input and try again.'
        );
      } else {
        Alert.alert(t('common.error'), error.message || t('common.tryAgain'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleNotification = (field: 'notification_promo' | 'notification_orders') => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.avatarContainer}>
            {authUser?.avatar ? (
              <Image source={{ uri: authUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="person" size={40} color="#666" />
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>{t('profile.updateProfilePicture')}</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.firstName')}</Text>
            <TextInput
              style={[styles.input, errors.first_name && styles.inputError]}
              value={formData.first_name}
              onChangeText={(value) => handleInputChange('first_name', value)}
              placeholder={t('profile.firstName')}
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.first_name && (
              <Text style={styles.errorText}>{errors.first_name}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.lastName')}</Text>
            <TextInput
              style={[styles.input, errors.last_name && styles.inputError]}
              value={formData.last_name}
              onChangeText={(value) => handleInputChange('last_name', value)}
              placeholder={t('profile.lastName')}
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.last_name && (
              <Text style={styles.errorText}>{errors.last_name}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.email')}</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder={t('profile.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.phone')}</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              placeholder={t('profile.phone')}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.birthDate')}</Text>
            <TouchableOpacity style={styles.input}>
              <Text style={[
                styles.inputText, 
                !formData.birth_date && styles.placeholderText
              ]}>
                {formData.birth_date || t('profile.selectBirthDate')}
              </Text>
              <Icon name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.notificationSettings')}</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>{t('profile.promoNotifications')}</Text>
              <Text style={styles.switchDescription}>
                Receive notifications about special offers and promotions
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.switch,
                formData.notification_promo && styles.switchActive
              ]}
              onPress={() => toggleNotification('notification_promo')}
            >
              <View style={[
                styles.switchThumb,
                formData.notification_promo && styles.switchThumbActive
              ]} />
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>{t('profile.orderNotifications')}</Text>
              <Text style={styles.switchDescription}>
                Receive updates about your order status
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.switch,
                formData.notification_orders && styles.switchActive
              ]}
              onPress={() => toggleNotification('notification_orders')}
            >
              <View style={[
                styles.switchThumb,
                formData.notification_orders && styles.switchThumbActive
              ]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? t('common.loading') : t('profile.saveChanges')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  form: {
    padding: 16,
  },
  profilePictureSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#007AFF',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProfileScreen;
