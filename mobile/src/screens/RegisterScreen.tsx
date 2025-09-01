import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { Typography, Spacing, BorderRadius, Shadow } from '../theme';

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = t('auth.enterFirstName');
    } else if (formData.first_name.length < 2) {
      newErrors.first_name = t('auth.firstNameTooShort');
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = t('auth.enterLastName');
    } else if (formData.last_name.length < 2) {
      newErrors.last_name = t('auth.lastNameTooShort');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('auth.enterEmail');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.invalidEmail');
    }

    if (!formData.password.trim()) {
      newErrors.password = t('auth.enterPassword');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.passwordTooShort');
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = t('auth.passwordComplexity');
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = t('auth.confirmPassword');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordMismatch');
    }

    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = t('auth.invalidPhone');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);
    
    if (result.success) {
      Alert.alert(
        t('common.success'), 
        result.message,
        [
          {
            text: t('common.ok'),
            onPress: () => {
              if (result.requiresVerification) {
                // Navigate to email verification screen if implemented
                navigation.replace('Login');
              } else {
                navigation.replace('Login');
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(t('common.error'), result.message);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.register')}
            </Text>
            <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.createAccount')}
            </Text>
          </View>

          <View style={styles.form}>
            {/* First Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.firstName')}
              </Text>
              <View style={[styles.inputWrapper, errors.first_name && styles.inputError]}>
                <Icon name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    { textAlign: isRTL ? 'right' : 'left' },
                    isRTL && { paddingRight: 45, paddingLeft: 15 }
                  ]}
                  placeholder={t('auth.enterFirstName')}
                  placeholderTextColor="#999"
                  value={formData.first_name}
                  onChangeText={(value) => handleInputChange('first_name', value)}
                  autoCapitalize="words"
                />
              </View>
              {errors.first_name && (
                <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {errors.first_name}
                </Text>
              )}
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.lastName')}
              </Text>
              <View style={[styles.inputWrapper, errors.last_name && styles.inputError]}>
                <Icon name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    { textAlign: isRTL ? 'right' : 'left' },
                    isRTL && { paddingRight: 45, paddingLeft: 15 }
                  ]}
                  placeholder={t('auth.enterLastName')}
                  placeholderTextColor="#999"
                  value={formData.last_name}
                  onChangeText={(value) => handleInputChange('last_name', value)}
                  autoCapitalize="words"
                />
              </View>
              {errors.last_name && (
                <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {errors.last_name}
                </Text>
              )}
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.email')}
              </Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Icon name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    { textAlign: isRTL ? 'right' : 'left' },
                    isRTL && { paddingRight: 45, paddingLeft: 15 }
                  ]}
                  placeholder={t('auth.enterEmail')}
                  placeholderTextColor="#999"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.phone')} ({t('common.optional')})
              </Text>
              <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                <Icon name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    { textAlign: isRTL ? 'right' : 'left' },
                    isRTL && { paddingRight: 45, paddingLeft: 15 }
                  ]}
                  placeholder={t('auth.enterPhone')}
                  placeholderTextColor="#999"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone && (
                <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {errors.phone}
                </Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.password')}
              </Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Icon name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    { textAlign: isRTL ? 'right' : 'left' },
                    isRTL && { paddingRight: 45, paddingLeft: 45 }
                  ]}
                  placeholder={t('auth.enterPassword')}
                  placeholderTextColor="#999"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.eyeIcon, isRTL && { left: 15, right: 'auto' }]}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon 
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {errors.password}
                </Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.confirmPassword')}
              </Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <Icon name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    { textAlign: isRTL ? 'right' : 'left' },
                    isRTL && { paddingRight: 45, paddingLeft: 45 }
                  ]}
                  placeholder={t('auth.confirmPassword')}
                  placeholderTextColor="#999"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.eyeIcon, isRTL && { left: 15, right: 'auto' }]}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icon 
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {errors.confirmPassword}
                </Text>
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>{t('auth.register')}</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>{t('auth.login')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    position: 'relative',
  },
  inputError: {
    borderColor: '#ff4757',
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 45,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 14,
    marginTop: 5,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  registerButtonDisabled: {
    backgroundColor: '#a8c5e8',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: '#666',
    fontSize: 16,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegisterScreen;
