import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  PermissionsAndroid,
  Platform,
  FlatListComponent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import ApiService, { Address } from '../services/apiService';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

interface AddressFormScreenProps {
  navigation: any;
  route: {
    params?: {
      address?: Address;
      onSave?: (address: Address) => void;
    };
  };
}

interface City {
  id: number;
  title_ar: string;
  title_en: string;
  is_active: boolean;
}

interface Area {
  id: number;
  title_ar: string;
  title_en: string;
  delivery_fee: string; // API returns as string
  is_active: boolean;
}

interface Street {
  id: number;
  title_ar: string;
  title_en: string;
  is_active: boolean;
}

const AddressFormScreen: React.FC<AddressFormScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { address: editingAddress, onSave } = route.params || {};
  
  const isEditing = !!editingAddress;

  // Form state
  const [name, setName] = useState(editingAddress?.name || '');
  const [phone, setPhone] = useState(editingAddress?.phone || '');
  const [buildingNo, setBuildingNo] = useState(editingAddress?.building_no || '');
  const [floorNo, setFloorNo] = useState(editingAddress?.floor_no || '');
  const [apartmentNo, setApartmentNo] = useState(editingAddress?.apartment_no || '');
  const [details, setDetails] = useState(editingAddress?.details || '');
  const [isDefault, setIsDefault] = useState(editingAddress?.is_default || false);

  // GPS state
  const [useGPS, setUseGPS] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Location state
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [streets, setStreets] = useState<Street[]>([]);
  const [streetsUnavailable, setStreetsUnavailable] = useState<boolean>(false);
  const [manualStreet, setManualStreet] = useState<string>('');
  
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<Street | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);
  
  const [showCityModal, setShowCityModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showStreetModal, setShowStreetModal] = useState(false);

  // Modal search queries
  const [cityQuery, setCityQuery] = useState('');
  const [areaQuery, setAreaQuery] = useState('');
  const [streetQuery, setStreetQuery] = useState('');

  // Enhanced error states for better UX
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    city?: string;
    area?: string;
    street?: string;
    building?: string;
    location?: string;
  }>({});
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  // GPS Permission and Location Methods
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: t('address.locationPermissionTitle'),
            message: t('address.locationPermissionMessage'),
            buttonNeutral: t('common.askLater'),
            buttonNegative: t('common.cancel'),
            buttonPositive: t('common.ok'),
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      Alert.alert(
        t('address.locationPermissionDenied'),
        t('address.locationPermissionDeniedMessage')
      );
      return;
    }

    setGpsLoading(true);
    
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setUseGPS(true);
        setGpsLoading(false);
        
        Alert.alert(
          t('address.locationDetected'),
          t('address.locationDetectedMessage'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                // When using GPS, make city/area/street optional
                // User can still select them if they want to be more specific
              }
            }
          ]
        );
      },
      (error) => {
        console.error('GPS Error:', error);
        setGpsLoading(false);
        Alert.alert(
          t('address.locationError'),
          t('address.locationErrorMessage')
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  useEffect(() => {
    if (isEditing && editingAddress && cities.length > 0) {
      // Find and set the existing city, area, and street
      const city = cities.find(c => c.id === editingAddress.city_id);
      if (city) {
        setSelectedCity(city);
        loadAreas(city.id, editingAddress.area_id);
      }
    }
  }, [cities, editingAddress, isEditing]);

  const loadCities = async () => {
    try {
      setLoadingCities(true);
      const response = await ApiService.getCities();
      
      if (response.success && response.data) {
        setCities(response.data);
        
        // Auto-select Amman (ID: 541) as default city since it has areas
        const ammanCity = response.data.find(city => city.id === 541);
        if (ammanCity && !selectedCity) {
          setSelectedCity(ammanCity);
          // Also load areas for Amman by default
          loadAreas(ammanCity.id);
        }
      } else {
        Alert.alert(t('common.error'), response.message);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
      Alert.alert(t('common.error'), t('address.errorLoadingCities'));
    } finally {
      setLoadingCities(false);
    }
  };

  const loadAreas = async (cityId: number, preSelectAreaId?: number) => {
    try {
      setLoadingAreas(true);
      const response = await ApiService.getAreas(cityId);
      
      if (response.success && response.data) {
        setAreas(response.data);
        
        if (preSelectAreaId) {
          const area = response.data.find(a => a.id === preSelectAreaId);
          if (area) {
            setSelectedArea(area);
            loadStreets(area.id, editingAddress?.street_id);
          }
        }
      } else {
        Alert.alert(t('common.error'), response.message);
      }
    } catch (error) {
      console.error('Error loading areas:', error);
      Alert.alert(t('common.error'), t('address.errorLoadingAreas'));
    } finally {
      setLoadingAreas(false);
    }
  };

  const loadStreets = async (areaId: number, preSelectStreetId?: number) => {
    try {
      setLoadingStreets(true);
      setStreetsUnavailable(false);
      const response = await ApiService.getStreets(areaId);
      
      if (response.success && response.data) {
        setStreets(response.data);
        if (!response.data || response.data.length === 0) {
          setStreetsUnavailable(true);
        }
        
        if (preSelectStreetId) {
          const street = response.data.find(s => s.id === preSelectStreetId);
          if (street) {
            setSelectedStreet(street);
          }
        }
      } else {
        setStreetsUnavailable(true);
        // Don't block the flow; allow manual street input
      }
    } catch (error) {
      console.error('Error loading streets:', error);
      setStreetsUnavailable(true);
    } finally {
      setLoadingStreets(false);
    }
  };

  const onCitySelect = (city: City) => {
    setSelectedCity(city);
    setSelectedArea(null);
    setSelectedStreet(null);
    setAreas([]);
    setStreets([]);
    setShowCityModal(false);
    loadAreas(city.id);
  };

  const onAreaSelect = (area: Area) => {
    setSelectedArea(area);
    setSelectedStreet(null);
    setStreets([]);
    setShowAreaModal(false);
    loadStreets(area.id);
  };

  const onStreetSelect = (street: Street) => {
    setSelectedStreet(street);
    setShowStreetModal(false);
  };

  const validateForm = (): boolean => {
    console.log('🔍 === VALIDATE FORM DEBUG ===');
    
    // Debug current form state
    console.log('📋 Current Form Data:', {
      name: `"${name}"`,
      nameLength: name.length,
      nameTrimmed: `"${name.trim()}"`,
      nameTrimmedLength: name.trim().length,
      phone: `"${phone}"`,
      phoneLength: phone.length,
      phoneTrimmed: `"${phone.trim()}"`,
      phoneTrimmedLength: phone.trim().length,
      phoneTest: /^[0-9+\-\s()]{7,15}$/.test(phone.trim()),
      phoneEmpty: !phone.trim(),
      phoneRegexMatch: phone.trim() ? /^[0-9+\-\s()]{7,15}$/.test(phone.trim()) : false,
      useGPS,
      currentLocation,
      selectedCity: selectedCity ? { id: selectedCity.id, name: selectedCity.title_en } : null,
      selectedArea: selectedArea ? { id: selectedArea.id, name: selectedArea.title_en } : null,
      selectedStreet: selectedStreet ? { id: selectedStreet.id, name: selectedStreet.title_en } : null,
      buildingNo: `"${buildingNo}"`,
      buildingNoTrimmed: `"${buildingNo.trim()}"`,
      details: `"${details}"`,
      detailsTrimmed: `"${details.trim()}"`,
      manualStreet: `"${manualStreet}"`,
      isEditing,
      editingAddressId: editingAddress?.id
    });

    // Clear previous error states
    const validationErrors: string[] = [];
    const newFieldErrors: typeof fieldErrors = {};

    // Required field validations with specific error tracking
    if (!name.trim()) {
      console.log('❌ Validation Error: Name is empty');
      validationErrors.push(t('address.nameRequired'));
      newFieldErrors.name = t('address.nameRequired');
    } else if (name.trim().length < 2) {
      console.log('❌ Validation Error: Name too short');
      validationErrors.push(t('address.nameTooShort'));
      newFieldErrors.name = t('address.nameTooShort');
    } else {
      console.log('✅ Name validation passed');
    }

    // TEMPORARY: Relaxed phone validation for debugging
    if (!phone.trim()) {
      console.log('❌ Validation Error: Phone is empty');
      validationErrors.push(t('address.phoneRequired'));
      newFieldErrors.phone = t('address.phoneRequired');
    } else if (phone.trim().length < 7) {
      console.log('❌ Validation Error: Phone too short');
      console.log('📱 Phone value:', phone.trim());
      console.log('📱 Phone length:', phone.trim().length);
      validationErrors.push('Phone number must be at least 7 characters');
      newFieldErrors.phone = 'Phone number must be at least 7 characters';
    } else {
      console.log('✅ Phone validation passed (relaxed validation)');
      console.log('📱 Phone value accepted:', phone.trim());
    }

    // Address location validation - either GPS or traditional address required
    if (!useGPS && !currentLocation) {
      console.log('🗺️ Traditional address mode validation');
      // Traditional address validation
      if (!selectedCity) {
        console.log('❌ Validation Error: City not selected');
        validationErrors.push(t('address.cityRequired'));
        newFieldErrors.city = t('address.cityRequired');
      } else {
        console.log('✅ City selected:', selectedCity.title_en);
      }
      
      if (!selectedArea) {
        console.log('❌ Validation Error: Area not selected');
        validationErrors.push(t('address.areaRequired'));
        newFieldErrors.area = t('address.areaRequired');
      } else {
        console.log('✅ Area selected:', selectedArea.title_en);
      }
      
      // Street is optional - user can provide manual street or building details
      console.log('ℹ️ Street is optional in traditional mode');
    } else if (useGPS && !currentLocation) {
      console.log('❌ Validation Error: GPS mode but no location');
      validationErrors.push(t('address.gpsLocationRequired'));
      newFieldErrors.location = t('address.gpsLocationRequired');
    } else if (useGPS && currentLocation) {
      console.log('✅ GPS mode with location:', currentLocation);
    } else {
      console.log('ℹ️ Location validation skipped (neither traditional nor GPS mode detected)');
    }

    // Building details validation
    const hasBuildingNo = buildingNo.trim().length > 0;
    const hasDetails = details.trim().length > 0;
    console.log('🏢 Building validation:', { hasBuildingNo, hasDetails });
    
    if (!hasBuildingNo && !hasDetails) {
      console.log('❌ Validation Error: No building number or details');
      validationErrors.push(t('address.buildingOrDetailsRequired'));
      newFieldErrors.building = t('address.buildingOrDetailsRequired');
    } else {
      console.log('✅ Building/details validation passed');
    }

    // Update field errors state
    setFieldErrors(newFieldErrors);
    setShowFieldErrors(Object.keys(newFieldErrors).length > 0);

    console.log('📊 Validation Summary:', {
      totalErrors: validationErrors.length,
      errors: validationErrors,
      fieldErrors: newFieldErrors
    });

    // Show comprehensive validation errors
    if (validationErrors.length > 0) {
      console.log('❌ Validation failed, showing alert');
      Alert.alert(
        t('address.validationErrors'),
        validationErrors.join('\n\n'),
        [{ text: t('common.ok'), style: 'default' }]
      );
      return false;
    }

    console.log('✅ All validations passed!');
    return true;
  };

  const handleSave = async () => {
    console.log('\n🚀 === HANDLE SAVE DEBUG ===');
    setSaving(true);
    
    try {
      // Run frontend validation since backend validation is removed
      console.log('🔍 Running frontend validation...');
      if (!validateForm()) {
        setSaving(false);
        return;
      }

      console.log('✅ Validation passed, proceeding with save');

      // Prepare address data with correct property mapping
      const baseAddressData = {
        name: name.trim(),
        phone: phone.trim(),
        building_no: buildingNo.trim(),
        floor_no: floorNo.trim(),
        apartment_no: apartmentNo.trim(),
        details: [details.trim(), manualStreet.trim()].filter(Boolean).join(' - '),
        is_default: isDefault,
      };

      console.log('📦 Base address data prepared:', baseAddressData);

      // Handle GPS vs traditional address modes
      const addressData = useGPS && currentLocation ? {
        ...baseAddressData,
        city_id: selectedCity?.id || 1, // Default to a valid city ID for GPS addresses
        area_id: selectedArea?.id || 1, // Default to a valid area ID for GPS addresses
        street_id: selectedStreet?.id,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      } : {
        ...baseAddressData,
        city_id: selectedCity!.id,
        area_id: selectedArea!.id,
        street_id: selectedStreet?.id,
        latitude: undefined,
        longitude: undefined,
      };

      console.log('🎯 Final address data to send:', {
        ...addressData,
        mode: useGPS ? 'GPS' : 'Traditional',
        isEditing,
        editingAddressId: editingAddress?.id,
        phoneValue: `"${addressData.phone}"`,
        phoneLength: addressData.phone ? addressData.phone.length : 0,
        phoneNotEmpty: !!addressData.phone
      });

      // API call with retry logic
      let response: any;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          console.log(`📡 API Call Attempt ${attempts + 1}/${maxAttempts}`);
          
          if (isEditing && editingAddress) {
            console.log(`🔄 Updating address ID: ${editingAddress.id}`);
            response = await ApiService.updateAddress(editingAddress.id, addressData);
          } else {
            console.log('🆕 Creating new address');
            response = await ApiService.createAddress(addressData);
          }
          
          console.log('✅ API call successful');
          console.log('📥 API Response:', response);
          break; // Success, exit retry loop
        } catch (error: any) {
          attempts++;
          console.error(`❌ Address save attempt ${attempts} failed:`, error);
          
          // Log detailed error information for debugging
          console.log('🔍 Complete error object:', error);
          console.log('🔍 Error details:', {
            message: error?.message,
            response: error?.response,
            status: error?.status,
            data: error?.data,
            name: error?.name,
            stack: error?.stack?.slice(0, 500) // Truncate stack trace
          });

          // Check if error has response data
          if (error?.response?.data) {
            console.log('🔍 Server response data:', error.response.data);
          }
          
          // Log the data being sent
          console.log('📦 Address data that was sent:', addressData);
          
          if (attempts >= maxAttempts) {
            console.log('💥 Max attempts reached, throwing error');
            throw error; // Re-throw after max attempts
          }
          
          console.log(`⏳ Retrying in ${Math.pow(2, attempts)} seconds...`);
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }

      if (response?.success) {
        console.log('🎉 Address saved successfully!');
        console.log('📄 Saved address data:', response.data);
        
        Alert.alert(
          t('common.success'),
          isEditing ? t('address.updateSuccess') : t('address.createSuccess'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                if (onSave && response.data) {
                  onSave(response.data);
                }
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        console.log('❌ API returned success: false');
        console.log('📄 Response details:', response);
        
        // Handle specific API errors
        const errorMessage = response?.message || t('address.saveError');
        Alert.alert(
          t('common.error'),
          errorMessage,
          [
            { text: t('common.tryAgain'), onPress: () => handleSave() },
            { text: t('common.cancel'), style: 'cancel' }
          ]
        );
      }
    } catch (error: any) {
      console.error('💥 Error saving address:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = t('address.saveError');
      let errorTitle = t('common.error');
      
      // Check for different types of errors
      if (error?.response) {
        // Server responded with error status
        const status = error.response.status;
        const responseData = error.response.data;
        
        console.log('🔍 Server error response:', {
          status,
          data: responseData,
          message: responseData?.message,
          headers: error.response.headers
        });
        
        switch (status) {
          case 400:
            errorTitle = t('address.validationFailed');
            console.log('⚠️ 400 Bad Request - Validation or data error');
            if (responseData?.message) {
              errorMessage = responseData.message;
              console.log('📝 Error message from server:', responseData.message);
            } else if (responseData?.errors) {
              // Handle validation errors array
              const validationErrors = Array.isArray(responseData.errors) 
                ? responseData.errors.join('\n') 
                : JSON.stringify(responseData.errors);
              errorMessage = `${t('address.validationErrors')}:\n${validationErrors}`;
              console.log('📝 Validation errors from server:', validationErrors);
            } else {
              errorMessage = t('address.invalidDataProvided');
              console.log('📝 Generic 400 error - invalid data');
            }
            break;
          case 401:
            errorTitle = t('auth.authRequired');
            errorMessage = t('auth.pleaseLoginAgain');
            console.log('🔐 401 Unauthorized - Authentication required');
            break;
          case 403:
            errorTitle = t('common.accessDenied');
            errorMessage = t('address.noPermissionToEdit');
            console.log('🚫 403 Forbidden - Access denied');
            break;
          case 404:
            errorTitle = t('address.notFound');
            errorMessage = isEditing ? t('address.addressNotFound') : t('address.endpointNotFound');
            console.log('🔍 404 Not Found - Resource not found');
            break;
          case 422:
            errorTitle = t('address.dataProcessingError');
            errorMessage = responseData?.message || t('address.unprocessableData');
            console.log('🔧 422 Unprocessable Entity - Data processing error');
            break;
          case 500:
            errorTitle = t('common.serverError');
            errorMessage = t('address.serverProcessingError');
            console.log('🚨 500 Internal Server Error');
            break;
          default:
            errorMessage = responseData?.message || `${t('common.serverError')} (${status})`;
            console.log(`❓ ${status} Unknown Status Code`);
        }
      } else if (error?.message) {
        // Network or other client-side errors
        console.log('🌐 Client-side error:', error.message);
        if (error.message.includes('Network request failed') || 
            error.message.includes('fetch')) {
          errorTitle = t('common.connectionError');
          errorMessage = t('address.networkError');
          console.log('📡 Network error detected');
        } else if (error.message.includes('timeout')) {
          errorTitle = t('common.timeoutError');
          errorMessage = t('address.timeoutError');
          console.log('⏱️ Timeout error detected');
        } else if (error.message.includes('JSON')) {
          errorTitle = t('address.dataFormatError');
          errorMessage = t('address.invalidResponseFormat');
          console.log('📄 JSON parsing error detected');
        } else {
          errorMessage = error.message;
          console.log('❓ Other client error:', error.message);
        }
      } else {
        console.log('❓ Unknown error type:', error);
      }
      
      console.log('📢 Showing error alert:', { errorTitle, errorMessage });
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [
          { text: t('common.tryAgain'), onPress: () => handleSave() },
          { text: t('common.cancel'), style: 'cancel' }
        ]
      );
    } finally {
      setSaving(false);
      console.log('🏁 Save operation completed');
    }
  };

  const renderLocationSelector = (
    label: string,
    selectedItem: { title_ar: string; title_en: string } | null,
    onPress: () => void,
    loading: boolean = false
  ) => {
    const displayText = selectedItem 
      ? (isRTL ? selectedItem.title_ar : selectedItem.title_en)
      : t('address.select');

    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isRTL && styles.rtlText]}>{label}</Text>
        <TouchableOpacity
          style={[
            styles.selector, 
            isRTL && styles.rtlSelector
          ]}
          onPress={onPress}
          disabled={loading}
        >
          <Text style={[
            styles.selectorText,
            !selectedItem && styles.placeholderText,
            isRTL && styles.rtlText
          ]}>
            {displayText}
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Icon 
              name={isRTL ? "chevron-back" : "chevron-forward"} 
              size={20} 
              color="#666" 
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    items: Array<{ id: number; title_ar: string; title_en: string }>,
    onSelect: (item: any) => void,
    loading: boolean = false,
    searchValue?: string,
    onSearchChange?: (text: string) => void,
    searchPlaceholder?: string
  ) => {
    const filteredItems = (items || []).filter(item => {
      if (!searchValue) return true;
      const q = searchValue.toLowerCase();
      return (
        (item.title_en || '').toLowerCase().includes(q) ||
        (item.title_ar || '').toLowerCase().includes(q)
      );
    });
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, isRTL && styles.rtlModalHeader]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              {typeof onSearchChange === 'function' && (
                <View style={styles.modalSearchContainer}>
                  <TextInput
                    style={[styles.modalSearchInput, isRTL && styles.rtlTextInput]}
                    placeholder={searchPlaceholder || t('common.search')}
                    value={searchValue}
                    onChangeText={onSearchChange}
                  />
                </View>
              )}
              {filteredItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.modalItem}
                  onPress={() => onSelect(item)}
                >
                  <Text style={[styles.modalItemText, isRTL && styles.rtlText]}>
                    {isRTL ? item.title_ar : item.title_en}
                  </Text>
                  <Icon name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
              {filteredItems.length === 0 && (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.modalItemText, { color: '#999' }, isRTL && styles.rtlText]}>
                    {t('common.no') + ' ' + t('common.items')}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.rtlContainer]}>
      <View style={[styles.header, isRTL && styles.rtlHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon 
            name={isRTL ? "chevron-forward" : "chevron-back"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {isEditing ? t('address.editAddress') : t('address.addAddress')}
        </Text>
        
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={[styles.saveButtonText, isRTL && styles.rtlText]}>
              {t('common.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* GPS Toggle */}
        <TouchableOpacity
          style={[
            styles.gpsToggle, 
            useGPS && styles.gpsToggleActive
          ]}
          onPress={() => {
            if (useGPS) {
              setUseGPS(false);
              setCurrentLocation(null);
            } else {
              getCurrentLocation();
            }
          }}
        >
          <View style={styles.gpsToggleContent}>
            <Icon 
              name={useGPS ? "location" : "location-outline"} 
              size={24} 
              color={useGPS ? "#fff" : "#007AFF"} 
            />
            <Text style={[
              styles.gpsToggleText, 
              useGPS && styles.gpsToggleTextActive,
              isRTL && styles.rtlText
            ]}>
              {gpsLoading ? t('address.detectingLocation') : 
               useGPS ? t('address.usingGPSLocation') : t('address.useCurrentLocation')}
            </Text>
            {gpsLoading && <ActivityIndicator size="small" color={useGPS ? "#fff" : "#007AFF"} />}
          </View>
        </TouchableOpacity>

        {/* Address Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && styles.rtlText]}>
            {t('address.addressName')}
          </Text>
          <TextInput
            style={[
              styles.textInput, 
              isRTL && styles.rtlTextInput
            ]}
            placeholder={t('address.addressNamePlaceholder')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && styles.rtlText]}>
            {t('address.phoneNumber')}
          </Text>
          <TextInput
            style={[
              styles.textInput, 
              isRTL && styles.rtlTextInput
            ]}
            placeholder={t('address.phoneNumberPlaceholder')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          {isEditing && !phone && (
            <Text style={[styles.helperText, styles.phoneHelperText, isRTL && styles.rtlText]}>
              💡 Phone number is required for delivery
            </Text>
          )}
        </View>

        {/* Location Selectors - Optional when using GPS */}
        {!useGPS && (
          <>
            {renderLocationSelector(
              t('address.city'),
              selectedCity,
              () => setShowCityModal(true),
              loadingCities
            )}

            {renderLocationSelector(
              t('address.area'),
              selectedArea,
              () => {
                if (!selectedCity) {
                  Alert.alert(t('common.error'), t('address.selectCityFirst'));
                  return;
                }
                setShowAreaModal(true);
              },
              loadingAreas
            )}

            {selectedArea && (
              <View style={styles.deliveryFeeContainer}>
                <Text style={[styles.deliveryFeeText, isRTL && styles.rtlText]}>
                  {t('checkout.deliveryFee')}: ${(Number(selectedArea.delivery_fee) || 0).toFixed(2)}
                </Text>
              </View>
            )}

            {renderLocationSelector(
              `${t('address.street')}`,
              selectedStreet,
              () => {
                if (!selectedArea) {
                  Alert.alert(t('common.error'), t('address.selectAreaFirst'));
                  return;
                }
                setShowStreetModal(true);
              },
              loadingStreets
            )}

            {/* Manual street input fallback */}
            {(streetsUnavailable || streets.length === 0) && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.rtlText]}>
                  {t('address.street')} ({t('common.optional')})
                </Text>
                <TextInput
                  style={[styles.textInput, isRTL && styles.rtlTextInput]}
                  placeholder={t('address.street')}
                  value={manualStreet}
                  onChangeText={setManualStreet}
                  autoCapitalize="words"
                />
                <Text style={[styles.helperText, isRTL && styles.rtlText]}>
                  {t('address.selectAreaFirst')}: {t('address.street')} {t('common.optional')}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Optional location selectors when using GPS */}
        {useGPS && (
          <View style={styles.gpsLocationInfo}>
            <Icon name="location" size={20} color="#28a745" />
            <Text style={[styles.gpsLocationText, isRTL && styles.rtlText]}>
              {t('address.usingGPSLocationInfo')}
            </Text>
          </View>
        )}

        {useGPS && (
          <>
            <Text style={[styles.optionalLabel, isRTL && styles.rtlText]}>
              {t('address.optionalLocationDetails')}
            </Text>
            
            {renderLocationSelector(
              t('address.city'),
              selectedCity,
              () => setShowCityModal(true),
              loadingCities
            )}

            {renderLocationSelector(
              t('address.area'),
              selectedArea,
              () => {
                if (!selectedCity) {
                  Alert.alert(t('common.error'), t('address.selectCityFirst'));
                  return;
                }
                setShowAreaModal(true);
              },
              loadingAreas
            )}

            {renderLocationSelector(
              t('address.street'),
              selectedStreet,
              () => {
                if (!selectedArea) {
                  Alert.alert(t('common.error'), t('address.selectAreaFirst'));
                  return;
                }
                setShowStreetModal(true);
              },
              loadingStreets
            )}

            {/* Manual street input fallback (GPS mode) */}
            {(streetsUnavailable || streets.length === 0) && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.rtlText]}>
                  {t('address.street')} ({t('common.optional')})
                </Text>
                <TextInput
                  style={[styles.textInput, isRTL && styles.rtlTextInput]}
                  placeholder={t('address.street')}
                  value={manualStreet}
                  onChangeText={setManualStreet}
                  autoCapitalize="words"
                />
              </View>
            )}
          </>
        )}

        {/* Building Details */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && styles.rtlText]}>
            {t('address.buildingNumber')}
          </Text>
          <TextInput
            style={[
              styles.textInput, 
              isRTL && styles.rtlTextInput
            ]}
            placeholder={t('address.buildingNumberPlaceholder')}
            value={buildingNo}
            onChangeText={setBuildingNo}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={[styles.label, isRTL && styles.rtlText]}>
              {t('address.floor')}
            </Text>
            <TextInput
              style={[styles.textInput, isRTL && styles.rtlTextInput]}
              placeholder={t('address.floorPlaceholder')}
              value={floorNo}
              onChangeText={setFloorNo}
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={[styles.label, isRTL && styles.rtlText]}>
              {t('address.apartment')}
            </Text>
            <TextInput
              style={[styles.textInput, isRTL && styles.rtlTextInput]}
              placeholder={t('address.apartmentPlaceholder')}
              value={apartmentNo}
              onChangeText={setApartmentNo}
            />
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isRTL && styles.rtlText]}>
            {t('address.additionalDetails')}
          </Text>
          <TextInput
            style={[styles.textAreaInput, isRTL && styles.rtlTextInput]}
            placeholder={t('address.additionalDetailsPlaceholder')}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={[styles.helperText, isRTL && styles.rtlText]}>
            {t('address.buildingOrDetailsHelper')}
          </Text>
        </View>

        {/* Default Address Toggle */}
        <TouchableOpacity
          style={[styles.defaultToggle, isRTL && styles.rtlDefaultToggle]}
          onPress={() => setIsDefault(!isDefault)}
        >
          <View style={styles.defaultToggleContent}>
            <Text style={[styles.defaultToggleText, isRTL && styles.rtlText]}>
              {t('address.setAsDefault')}
            </Text>
            <View style={[styles.checkbox, isDefault && styles.checkedCheckbox]}>
              {isDefault && <Icon name="checkmark" size={16} color="#fff" />}
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      {renderModal(
        showCityModal,
        () => setShowCityModal(false),
        t('address.selectCity'),
        cities,
        onCitySelect,
        loadingCities,
        cityQuery,
        setCityQuery,
        t('common.search') + ' ' + t('address.city')
      )}

      {renderModal(
        showAreaModal,
        () => setShowAreaModal(false),
        t('address.selectArea'),
        areas,
        onAreaSelect,
        loadingAreas,
        areaQuery,
        setAreaQuery,
        t('common.search') + ' ' + t('address.area')
      )}

      {renderModal(
        showStreetModal,
        () => setShowStreetModal(false),
        t('address.selectStreet'),
        streets,
        onStreetSelect,
        loadingStreets,
        streetQuery,
        setStreetQuery,
        t('common.search') + ' ' + t('address.street')
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  rtlHeader: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  saveButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  rtlTextInput: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  rtlSelector: {
    flexDirection: 'row-reverse',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  deliveryFeeContainer: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 15,
  },
  deliveryFeeText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  defaultToggle: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  rtlDefaultToggle: {
    alignItems: 'flex-start',
  },
  defaultToggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  defaultToggleText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkedCheckbox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  
  // GPS Styles
  gpsToggle: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  gpsToggleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  gpsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  gpsToggleText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  gpsToggleTextActive: {
    color: '#fff',
  },
  gpsLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  gpsLocationText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
    flex: 1,
  },
  optionalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  rtlModalHeader: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
  },
  phoneHelperText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  // Error states
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  selectorError: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  gpsToggleError: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginLeft: 6,
    flex: 1,
  },
  // Validation Summary
  validationSummary: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 20,
    padding: 16,
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  validationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
    marginLeft: 8,
  },
  validationList: {
    gap: 8,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  validationItemText: {
    fontSize: 12,
    color: '#dc3545',
    flex: 1,
    lineHeight: 16,
  },
  // Success Summary
  successSummary: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 20,
    padding: 16,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginLeft: 8,
  },
  successText: {
    fontSize: 12,
    color: '#059669',
    lineHeight: 16,
  },
});

export default AddressFormScreen;
