import React, { useState, useEffect, useRef } from 'react';
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
  Vibration,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService, { Address, OrderCalculation, PromoCode } from '../services/apiService';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { Typography, Spacing, BorderRadius, Shadow } from '../theme';
import guestOrderService from '../services/guestOrderService';
import Toast from '../components/common/Toast';
import EnhancedButton from '../components/common/EnhancedButton';
import HapticFeedback from '../utils/HapticFeedback';

interface CheckoutScreenProps {
  navigation: any;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user, isGuest } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const [branches, setBranches] = useState<Array<{ id: number; title_en?: string; title_ar?: string; latitude?: number; longitude?: number }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  // Helper function to calculate promo discount based on type
  const calculatePromoDiscount = (promo: PromoCode | null, orderTotal: number): number => {
    if (!promo) return 0;
    
    let discountAmount = 0;
    
    switch (promo.discount_type) {
      case 'percentage':
        discountAmount = orderTotal * (promo.discount_value / 100);
        break;
      case 'fixed':
      case 'fixed_amount':
        discountAmount = promo.discount_value;
        break;
      case 'free_shipping':
        // Free shipping promos don't affect order total discount
        discountAmount = 0;
        break;
      case 'bxgy':
        // Buy X Get Y promos need item-level calculation, for now return 0
        discountAmount = 0;
        break;
      default:
        // Legacy support: treat unknown types as fixed amount
        discountAmount = promo.discount_value;
        break;
    }
    
    // Apply maximum discount limit
    if (promo.max_discount_amount && discountAmount > promo.max_discount_amount) {
      discountAmount = promo.max_discount_amount;
    }
    
    return Math.min(discountAmount, orderTotal);
  };

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [orderCalculation, setOrderCalculation] = useState<OrderCalculation | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  
  // Enhanced UI states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [orderProgress, setOrderProgress] = useState(0);
  const [canPlaceOrder, setCanPlaceOrder] = useState(false);
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);

  // Prevent stale calculateOrder responses from overwriting newer results
  const calcRequestRef = useRef(0);
  // Persist last validated promo to keep free-shipping sticky across recalculations
  const lastValidatedPromoRef = useRef<PromoCode | null>(null);

  // Error states for modern error handling
  const [errors, setErrors] = useState({
    addresses: null as string | null,
    calculation: null as string | null,
    promoCode: null as string | null,
    order: null as string | null,
    general: null as string | null,
  });
  const [retryCount, setRetryCount] = useState({
    addresses: 0,
    calculation: 0,
    promoCode: 0,
    order: 0,
  });

  // Guest user information
  const [guestInfo, setGuestInfo] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [guestErrors, setGuestErrors] = useState<{ [key: string]: string }>({});

  const paymentMethods = [
    { id: 'cash', title: t('checkout.paymentMethods.cash'), icon: 'cash-outline' },
    { id: 'card', title: t('checkout.paymentMethods.card'), icon: 'card-outline' },
    { id: 'wallet', title: t('checkout.paymentMethods.wallet'), icon: 'wallet-outline' },
  ];

  // Error recovery functions
  const clearError = (errorType: keyof typeof errors) => {
    setErrors(prev => ({ ...prev, [errorType]: null }));
  };

  const clearAllErrors = () => {
    setErrors({
      addresses: null,
      calculation: null,
      promoCode: null,
      order: null,
      general: null,
    });
  };

  const handleError = (errorType: keyof typeof errors, error: any, fallbackMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : 
                        (typeof error === 'string' ? error : fallbackMessage);
    
    setErrors(prev => ({ ...prev, [errorType]: errorMessage }));
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      clearError(errorType);
    }, 5000);
  };

  const canRetry = (type: keyof typeof retryCount) => retryCount[type] < 3;

  const incrementRetry = (type: keyof typeof retryCount) => {
    setRetryCount(prev => ({ ...prev, [type]: prev[type] + 1 }));
  };

  // Validation effect to check if order can be placed
  useEffect(() => {
    const validateOrder = () => {
      let isValid = true;
      let progress = 0;
      
      // Check cart items
      if (items && items.length > 0) {
        progress += 20;
      } else {
        isValid = false;
      }
      
      // Check address for delivery
      if (orderType === 'delivery') {
        if (isGuest && guestInfo.address.trim()) {
          progress += 20;
        } else if (!isGuest && selectedAddress) {
          progress += 20;
        } else {
          isValid = false;
        }
      } else {
        progress += 20; // No address needed for pickup
      }
      
      // Check guest info
      if (isGuest) {
        if (guestInfo.fullName.trim() && guestInfo.phone.trim()) {
          progress += 20;
        } else {
          isValid = false;
        }
      } else {
        progress += 20; // User info available
      }
      
      // Check branch selection
      if (selectedBranchId || branches[0]?.id) {
        progress += 20;
      } else {
        isValid = false;
      }
      
      // Check order calculation
      if (orderCalculation && orderCalculation.total_amount > 0) {
        progress += 20;
      } else {
        isValid = false;
      }
      
      setOrderProgress(progress);
      setCanPlaceOrder(isValid);
    };
    
    validateOrder();
  }, [items, orderType, isGuest, guestInfo, selectedAddress, selectedBranchId, branches, orderCalculation]);

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
    // Always calculate on mount
    calculateOrder();
  // Load branches for branch validation & distance-based fee when possible
  loadBranches();
  }, [user]);

  useEffect(() => {
    calculateOrder();
  }, [selectedAddress, orderType, appliedPromo]);

  // Recalculate when branch selection changes or branches load
  useEffect(() => {
    if (orderType === 'delivery') {
      calculateOrder();
    }
  }, [selectedBranchId, branches.length]);

  // Load active branches
  const loadBranches = async () => {
    try {
      const res = await ApiService.getBranches();
      if (res?.success && Array.isArray(res.data)) {
        setBranches(res.data as any);
        // Pick a sensible default branch
        if (!selectedBranchId && res.data.length > 0) {
          setSelectedBranchId(res.data[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to load branches', e);
    }
  };

  // Haversine distance in KM
  const distanceKm = (lat1?: number, lon1?: number, lat2?: number, lon2?: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  };

  // Determine nearest branch based on selected address coords
  const pickNearestBranch = () => {
    try {
      if (!selectedAddress || branches.length === 0) return;
      const { latitude, longitude } = selectedAddress as any;
      if (!latitude || !longitude) return;
      let bestId: number | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const b of branches) {
        const d = distanceKm(latitude, longitude, Number(b.latitude), Number(b.longitude));
        if (d !== null && d < bestDist) {
          bestDist = d;
          bestId = b.id;
        }
      }
      if (bestId) setSelectedBranchId(bestId);
    } catch {}
  };

  useEffect(() => {
    pickNearestBranch();
  }, [selectedAddress, branches]);

  // 🔄 SOLUTION: Add useFocusEffect to reload addresses when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        console.log('🔄 CheckoutScreen focused - reloading addresses and recalculating');
        loadAddresses();
        calculateOrder();
      }
    }, [user])
  );

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      clearError('addresses');
      
      console.log('🔄 Loading addresses for user:', user?.id);
      const response = await ApiService.getUserAddresses();
      console.log('📍 Address API response:', response);
      
      if (response?.success && response?.data && Array.isArray(response.data)) {
        const addressList = response.data;
        setAddresses(addressList);
        console.log('✅ Loaded addresses:', addressList.length);
        
        // Select default address
        const defaultAddress = addressList.find(addr => addr?.is_default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
          console.log('🏠 Selected default address:', defaultAddress.name);
        } else if (addressList.length > 0) {
          setSelectedAddress(addressList[0]);
          console.log('🏠 Selected first address:', addressList[0].name);
        }
      } else {
        console.warn('❌ Invalid addresses response:', response);
        setAddresses([]);
        
        // Handle specific validation errors
        if (response?.errors && Array.isArray(response.errors)) {
          const errorDetails = response.errors.map(err => err.message || err).join(', ');
          handleError('addresses', `Validation error: ${errorDetails}`, t('checkout.errorLoadingAddresses'));
        } else {
          const errorMessage = response?.message || response?.message_ar || 'Invalid response format';
          handleError('addresses', errorMessage, t('checkout.errorLoadingAddresses'));
        }
      }
    } catch (error) {
      console.error('❌ Error loading addresses:', error);
      setAddresses([]);
      handleError('addresses', error, t('checkout.errorLoadingAddresses'));
      incrementRetry('addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const calculateOrder = async () => {
  const requestId = ++calcRequestRef.current;
    if (!items || items.length === 0) {
      setLoading(false);
      clearError('calculation');
      setOrderCalculation({
        items: [],
        subtotal: 0,
        delivery_fee: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        points_earned: 0,
        promo_details: undefined
      });
      return;
    }

    try {
      setLoading(true);
      clearError('calculation');
  // Prefer appliedPromo; fall back to last validated promo to avoid setState timing issues
  const promoCandidate: PromoCode | null = appliedPromo || lastValidatedPromoRef.current || null;

      // For delivery orders, ensure we have a branch before calculating
      if (orderType === 'delivery') {
        const branchIdReady = selectedBranchId || (branches[0]?.id ?? null);
        if (!branchIdReady) {
          console.log('⏳ Waiting for branches to load before calculation...');
          setLoading(false);
          return;
        }
      }
      
      const requestData: any = {
        items: (items || []).map(item => ({
          product_id: item?.product_id,
          variant_id: item?.variant_id,
          quantity: item?.quantity || 1,
          special_instructions: item?.special_instructions,
        })),
        delivery_address_id: orderType === 'delivery' && selectedAddress ? selectedAddress.id : undefined,
  branch_id: selectedBranchId || (branches[0]?.id ?? undefined),
        order_type: orderType,
        promo_code: promoCandidate?.code,
        is_guest: isGuest,
      };

      // Diagnostics: log whether address has coordinates
      if (orderType === 'delivery') {
        const hasCoords = !!(selectedAddress && (selectedAddress as any).latitude && (selectedAddress as any).longitude);
        console.log('📍 Address has coordinates:', hasCoords, 'address_id:', selectedAddress?.id);
      }
      // For authenticated users with coordinates, provide delivery_coordinates to get distance-based fee
      if (!isGuest && orderType === 'delivery' && selectedAddress && (selectedAddress as any).latitude && (selectedAddress as any).longitude) {
        requestData.delivery_coordinates = {
          latitude: Number((selectedAddress as any).latitude),
          longitude: Number((selectedAddress as any).longitude),
          area_id: (selectedAddress as any).area_id,
        };
      }

      // Provide guest delivery address context when available
      if (isGuest && orderType === 'delivery' && guestInfo.address?.trim()) {
        // Prefer object format to optionally include branch/coords if available
        requestData.guest_delivery_address = {
          address: guestInfo.address.trim(),
          branch_id: requestData.branch_id,
          ...(selectedAddress && (selectedAddress as any).latitude && (selectedAddress as any).longitude
            ? {
                latitude: Number((selectedAddress as any).latitude),
                longitude: Number((selectedAddress as any).longitude),
                area_id: (selectedAddress as any).area_id,
              }
            : {})
        };
      }

  console.log('💳 Applied Promo Code:', promoCandidate?.code);
  console.log('🔍 Full Applied Promo:', JSON.stringify(promoCandidate, null, 2));

      // Add timeout to the request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

  const response = await Promise.race([
        ApiService.calculateOrderTotals(requestData),
        timeoutPromise
      ]) as any;
      
      console.log(`📊 Order calculation request [#${requestId}]:`, JSON.stringify(requestData, null, 2));
      console.log(`📊 Order calculation response [#${requestId}]:`, JSON.stringify(response, null, 2));
      
  if (response?.success && response?.data) {
        console.log(`✅ Setting order calculation [#${requestId}]:`, response.data);
        console.log('💰 Applied discount:', response.data.discount_amount);
        console.log('🎫 Promo details:', response.data.promo_details);
        
        // If we have an applied promo but no discount from backend, calculate it locally
        if (promoCandidate && (!response.data.discount_amount || response.data.discount_amount === 0)) {
          console.log('⚠️ Backend returned no discount, calculating locally...');
          const localDiscount = calculatePromoDiscount(promoCandidate, response.data.subtotal || 0);
          console.log('💰 Local discount calculation:', localDiscount);
          
          response.data.discount_amount = localDiscount;
          response.data.total_amount = (response.data.subtotal || 0) + (response.data.delivery_fee || 0) - localDiscount;
          response.data.promo_details = promoCandidate;
        }
        
        // Enhanced delivery fee calculation with multiple fallback strategies
        let calc = response.data as OrderCalculation;
        if (orderType === 'delivery') {
          // Strategy 1: Use area-based delivery fee from selected address
          const areaFee = (() => {
            try {
              // Check if selected address has area delivery fee
              if (selectedAddress && (selectedAddress as any)?.area_delivery_fee !== undefined) {
                return Number((selectedAddress as any).area_delivery_fee);
              }
              // Fallback to delivery_fee property
              if (selectedAddress && (selectedAddress as any)?.delivery_fee !== undefined) {
                return Number((selectedAddress as any).delivery_fee);
              }
              return 0;
            } catch { 
              return 0; 
            }
          })();

          // Strategy 2: Distance-based calculation if we have coordinates
          const calculateDistanceBasedFee = () => {
            if (!selectedAddress || !branches.length) return 0;
            
            const br = branches.find(b => b.id === (selectedBranchId || branches[0]?.id));
            if (!br || !br.latitude || !br.longitude) return 0;
            
            const addressLat = (selectedAddress as any)?.latitude;
            const addressLng = (selectedAddress as any)?.longitude;
            if (!addressLat || !addressLng) return 0;
            
            const distance = distanceKm(
              Number(addressLat), 
              Number(addressLng), 
              Number(br.latitude), 
              Number(br.longitude)
            );
            
            if (distance === null) return 0;
            
            // Enhanced distance-based pricing tiers
            if (distance <= 2) return 1.0;      // Very close
            if (distance <= 5) return 2.0;      // Close
            if (distance <= 10) return 3.0;     // Medium
            if (distance <= 20) return 4.5;     // Far
            if (distance <= 35) return 6.0;     // Very far
            return 8.0;                          // Extra far
          };

          // Strategy 3: Default fee based on order value
          const getDefaultDeliveryFee = () => {
            const subtotal = calc.subtotal || 0;
            if (subtotal >= 100) return 0;      // Free delivery over $100
            if (subtotal >= 50) return 1.5;     // Reduced fee over $50
            return 3.0;                          // Standard fee
          };

          // Apply delivery fee logic with priority order
          let finalDeliveryFee = Number(calc.delivery_fee) || 0;
          
          // If backend returned 0 or no fee, calculate using our strategies
          if (finalDeliveryFee === 0) {
            if (areaFee > 0) {
              finalDeliveryFee = areaFee;
              console.log('📍 Using area-based delivery fee:', areaFee);
            } else {
              const distanceFee = calculateDistanceBasedFee();
              if (distanceFee > 0) {
                finalDeliveryFee = distanceFee;
                console.log('🗺️ Using distance-based delivery fee:', distanceFee);
              } else {
                finalDeliveryFee = getDefaultDeliveryFee();
                console.log('💰 Using default delivery fee:', finalDeliveryFee);
              }
            }
          }

          // Apply free shipping promotions (sticky across recalculations)
          const backendPromoType = (calc as any)?.promo_details?.discount_type;
          const hasFreeShippingPromo =
            (appliedPromo?.discount_type === 'free_shipping') ||
            (lastValidatedPromoRef.current?.discount_type === 'free_shipping') ||
            (backendPromoType === 'free_shipping');
          if (hasFreeShippingPromo) {
            const originalFee = Number(calc.delivery_fee) || 0;
            finalDeliveryFee = 0;
            console.log('🎁 Free shipping applied via promo code (reason):', JSON.stringify({
              appliedPromoType: appliedPromo?.discount_type,
              lastValidatedPromoType: lastValidatedPromoRef.current?.discount_type,
              backendPromoType,
            }));
            // Store waived shipping amount so UI can show the true savings line
            (calc as any).waived_delivery_fee = originalFee;
          } else {
            // Ensure any previous waived flag is cleared when promo no longer applies
            if ((calc as any).waived_delivery_fee) {
              (calc as any).waived_delivery_fee = 0;
            }
          }

          // Apply free shipping threshold (business logic)
          const freeShippingThreshold = 75; // Configurable threshold
          if ((calc.subtotal || 0) >= freeShippingThreshold) {
            finalDeliveryFee = 0;
            console.log(`🆓 Free shipping applied (order over $${freeShippingThreshold})`);
          }

          // Update calculation with final delivery fee
          calc = {
            ...calc,
            delivery_fee: finalDeliveryFee,
            total_amount: (calc.subtotal || 0) + finalDeliveryFee - (calc.discount_amount || 0) + (calc.tax_amount || 0),
          } as OrderCalculation;

          console.log('📊 Final delivery fee calculation:', JSON.stringify({
            areaFee,
            distanceBasedFee: calculateDistanceBasedFee(),
            defaultFee: getDefaultDeliveryFee(),
            finalDeliveryFee,
            subtotal: calc.subtotal,
            total: calc.total_amount
          }, null, 2));
        }
        // Only apply the latest calculation result
        if (requestId === calcRequestRef.current) {
          setOrderCalculation(calc);
        } else {
          console.log(`⏭️ Skipping stale calculation result [#${requestId}] in favor of [#${calcRequestRef.current}]`);
        }
      } else {
        console.error('Calculate order error:', response?.message);
        const errorMessage = response?.message || t('checkout.errorCalculating');
        handleError('calculation', errorMessage, t('checkout.errorCalculating'));
        
        // Set a default calculation to prevent infinite loading
        const fallbackDiscountAmount = appliedPromo ? 
          calculatePromoDiscount(appliedPromo, totalAmount || 0) : 0;
        
        setOrderCalculation({
          items: requestData?.items || [],
          subtotal: totalAmount || 0,
          delivery_fee: orderType === 'delivery' ? 5.99 : 0,
          tax_amount: 0,
          discount_amount: Math.min(fallbackDiscountAmount, totalAmount || 0),
          total_amount: (totalAmount || 0) + (orderType === 'delivery' ? 5.99 : 0) - fallbackDiscountAmount,
          points_earned: 0,
          promo_details: appliedPromo || undefined
        });
      }
    } catch (error: any) {
      console.error('Error calculating order:', error);
      incrementRetry('calculation');
      
      // Set a fallback calculation to prevent infinite loading
      const fallbackDiscountAmount = appliedPromo ? 
        calculatePromoDiscount(appliedPromo, totalAmount || 0) : 0;
      
      setOrderCalculation({
        items: (items || []).map(item => ({
          product_id: item?.product_id || 0,
          variant_id: item?.variant_id || 0,
          quantity: item?.quantity || 1,
          unit_price: 0,
          total_price: 0,
          points_earned: 0,
          special_instructions: item?.special_instructions || '',
        })),
        subtotal: totalAmount || 0,
        delivery_fee: orderType === 'delivery' ? 5.99 : 0,
        tax_amount: 0,
        discount_amount: Math.min(fallbackDiscountAmount, totalAmount || 0),
        total_amount: (totalAmount || 0) + (orderType === 'delivery' ? 5.99 : 0) - fallbackDiscountAmount,
        points_earned: 0,
        promo_details: appliedPromo || undefined
      });
      
      if (error?.message === 'Request timeout') {
        handleError('calculation', 'Order calculation timed out. Please try again.', t('checkout.errorCalculating'));
      } else {
        handleError('calculation', error, t('checkout.errorCalculating'));
      }
    } finally {
      // Only clear loading for the latest request
      if (requestId === calcRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setAppliedPromo(null);
      clearError('promoCode');
      return;
    }

    try {
      setValidatingPromo(true);
      clearError('promoCode');
      
      console.log('🎫 Validating promo code:', promoCode.trim(), 'with total:', totalAmount || 0);
      
      const response = await ApiService.validatePromoCode(promoCode.trim(), totalAmount || 0, isGuest);
      
      console.log('🎫 Promo validation response:', JSON.stringify(response, null, 2));
      
      if (response?.success && response?.data && ((response as any).data.promo || (response as any).data.promo_code)) {
        const raw = (response as any).data;
        const promoData: PromoCode = (raw.promo || raw.promo_code) as PromoCode;
        console.log('✅ Promo validation successful:', promoData);
        console.log('💰 Discount amount from validation:', response.data.discount_amount);
        console.log('💵 Final amount from validation:', response.data.final_amount);
        console.log('🔍 Full validation response:', JSON.stringify(response.data, null, 2));
        
        // Clear any previous errors first
        clearError('promoCode');
        
  // Set the applied promo and persist it
  setAppliedPromo(promoData);
  lastValidatedPromoRef.current = promoData;
        
        // Calculate expected discount
        const expectedDiscount = calculatePromoDiscount(promoData, totalAmount || 0);
        console.log('📊 Expected discount calculation:', expectedDiscount);
        
        // Show success message
        Alert.alert(
          t('common.success') || 'Success', 
          `${t('checkout.promoApplied') || 'Promo code applied successfully!'}\nDiscount: $${Number(response.data.discount_amount || expectedDiscount).toFixed(2)}`
        );
        
        // Force recalculation after promo is applied
        setTimeout(() => {
          console.log('🔄 Recalculating order after promo applied...');
          calculateOrder();
        }, 100);
      } else {
        console.warn('❌ Promo validation failed:', response?.message);
        setAppliedPromo(null);
        const errorMessage = response?.message || response?.errors?.[0]?.message || t('checkout.invalidPromo') || 'Invalid promo code';
        handleError('promoCode', errorMessage, t('checkout.invalidPromo') || 'Invalid promo code');
      }
    } catch (error) {
      console.error('❌ Error validating promo code:', error);
      setAppliedPromo(null);
      incrementRetry('promoCode');
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      handleError('promoCode', errorMessage, t('checkout.invalidPromo') || 'Invalid promo code');
    } finally {
      setValidatingPromo(false);
    }
  };

  const removePromoCode = () => {
    console.log('🗑️ Removing promo code...');
    setPromoCode('');
    setAppliedPromo(null);
  lastValidatedPromoRef.current = null;
    clearError('promoCode');
  // Force recalculation immediately after promo is removed
  console.log('🔄 Recalculating order after promo removed...');
  calculateOrder();
  };

  const validateGuestInfo = () => {
    const errors: { [key: string]: string } = {};
    
    if (!guestInfo.fullName.trim()) {
      errors.fullName = t('auth.firstNameRequired');
    }
    
    if (!guestInfo.phone.trim()) {
      errors.phone = t('auth.enterPhone');
    }
    
    if (orderType === 'delivery' && !guestInfo.address.trim()) {
      errors.address = t('checkout.addressRequired');
    }
    
    setGuestErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const placeOrder = async () => {
    try {
      // Clear previous errors
      clearAllErrors();

      // Enhanced validation checks with detailed error reporting
      if (isGuest && !validateGuestInfo()) {
        setPlacingOrder(false);
        return;
      }

      if (!user && !isGuest) {
        handleError('order', 'Authentication required', t('auth.loginRequired'));
        setPlacingOrder(false);
        return;
      }

      if (!items || items.length === 0) {
        handleError('order', 'Cart is empty', t('cart.empty'));
        setPlacingOrder(false);
        return;
      }

      // Validate cart items have valid data
      const invalidItems = items.filter(item => 
        !item?.product_id || 
        !item?.quantity || 
        item.quantity <= 0 ||
        isNaN(Number(item.quantity))
      );
      
      if (invalidItems.length > 0) {
        handleError('order', 'Invalid items in cart', t('checkout.invalidItems') || 'Some items in your cart are invalid');
        setPlacingOrder(false);
        return;
      }

      if (orderType === 'delivery' && !isGuest && !selectedAddress) {
        handleError('order', 'Address selection required', t('checkout.selectAddress'));
        setPlacingOrder(false);
        return;
      }

      if (orderType === 'delivery' && isGuest && !guestInfo.address.trim()) {
        handleError('order', 'Delivery address required', t('checkout.addressRequired'));
        setPlacingOrder(false);
        return;
      }

      // Validate order calculation exists and has valid totals
      if (!orderCalculation) {
        handleError('order', 'Order calculation missing', t('checkout.calculationRequired') || 'Order calculation is required');
        setPlacingOrder(false);
        return;
      }

      if (orderCalculation.total_amount <= 0) {
        handleError('order', 'Invalid order total', t('checkout.invalidTotal') || 'Order total must be greater than zero');
        setPlacingOrder(false);
        return;
      }

      setPlacingOrder(true);

      // Enhanced branch and customer info validation
      let branchIdToUse = selectedBranchId || (branches[0]?.id ?? null);
      if (!branchIdToUse) {
        handleError('order', 'Branch not available', t('checkout.selectBranch') || 'Please select a branch');
        setPlacingOrder(false);
        return;
      }

      const derivedName = isGuest
        ? guestInfo.fullName.trim()
        : `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || (selectedAddress as any)?.name || 'Customer';
      const derivedPhone = isGuest
        ? guestInfo.phone.trim()
        : (user?.phone || (selectedAddress as any)?.phone || '').toString().trim();

      // Enhanced name and phone validation
      if (!derivedName || derivedName.length < 2) {
        handleError('order', 'Valid customer name is required', t('checkout.customerNameRequired') || 'Customer name must be at least 2 characters');
        setPlacingOrder(false);
        return;
      }

      if (!derivedPhone || !/^[0-9+\-\s()]{7,15}$/.test(derivedPhone)) {
        handleError('order', 'Valid phone number is required', t('checkout.customerPhoneRequired') || 'Please provide a valid phone number');
        setPlacingOrder(false);
        return;
      }

      // Build comprehensive order data with error handling
      const orderData: any = {
        items: items.map(item => ({
          product_id: Number(item.product_id),
          variant_id: item.variant_id ? Number(item.variant_id) : undefined,
          quantity: Number(item.quantity),
          special_instructions: item.special_instructions?.trim() || undefined,
        })),
        branch_id: Number(branchIdToUse),
        delivery_address_id: orderType === 'delivery' && selectedAddress ? Number(selectedAddress.id) : undefined,
        customer_name: derivedName,
        customer_phone: derivedPhone,
        customer_email: isGuest ? (guestInfo.email?.trim() || undefined) : (user?.email || undefined),
        guest_delivery_address: isGuest && orderType === 'delivery' ? guestInfo.address.trim() : undefined,
        order_type: orderType,
        payment_method: paymentMethod,
        promo_code: appliedPromo?.code || undefined,
        special_instructions: specialInstructions?.trim() || undefined,
        is_guest: isGuest,
        // Enhanced delivery information for better fee calculation
        expected_total: orderCalculation.total_amount,
        expected_delivery_fee: orderType === 'delivery' ? orderCalculation.delivery_fee : 0,
        expected_discount: orderCalculation.discount_amount || 0,
      };

      // Enhanced coordinates and address context for delivery orders
      if (orderType === 'delivery') {
        if (!isGuest && selectedAddress && (selectedAddress as any).latitude && (selectedAddress as any).longitude) {
          orderData.delivery_coordinates = {
            latitude: Number((selectedAddress as any).latitude),
            longitude: Number((selectedAddress as any).longitude),
            area_id: (selectedAddress as any).area_id,
            city_id: (selectedAddress as any).city_id,
            street_id: (selectedAddress as any).street_id,
          };
        }
        
        // For guest orders with delivery, ensure we have address details
        if (isGuest && guestInfo.address) {
          orderData.guest_delivery_details = {
            address: guestInfo.address.trim(),
            notes: guestInfo.notes?.trim() || undefined,
            // If we have GPS location from address form, include it
            ...(selectedAddress && (selectedAddress as any).latitude ? {
              latitude: Number((selectedAddress as any).latitude),
              longitude: Number((selectedAddress as any).longitude),
            } : {})
          };
        }
      }

      console.log('🚀 Placing order with data:', JSON.stringify(orderData, null, 2));

      // Enhanced API call with retry logic and timeout
      let response;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Order creation timeout')), 30000)
          );

          response = await Promise.race([
            ApiService.createOrder(orderData),
            timeoutPromise
          ]) as any;

          // Check if we got a successful response
          if (response?.success && response?.data) {
            break; // Success, exit retry loop
          } else {
            throw new Error(response?.message || 'Order creation failed');
          }
        } catch (error) {
          attempts++;
          console.error(`Order creation attempt ${attempts} failed:`, error);
          
          if (attempts >= maxAttempts) {
            throw error; // Re-throw after max attempts
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
      
      if (response?.success && response?.data) {
        // Save guest order locally for guest users
        if (isGuest && response.data.order) {
          try {
            await guestOrderService.saveGuestOrder(
              response.data.order,
              {
                phone: guestInfo.phone,
                email: guestInfo.email,
              }
            );
            console.log('✅ Guest order saved locally');
          } catch (error) {
            console.error('❌ Failed to save guest order locally:', error);
            // Don't fail the order placement if local storage fails
          }
        }
        
        clearCart();
        clearAllErrors(); // Clear all errors on successful order
        
        // Enhanced haptic feedback for success
        HapticFeedback.success();
        
        // Get order ID from response (handle different response structures)
        const orderId = response.data.order?.id || 'N/A';
        console.log('✅ Order created successfully:', orderId);
        
        // Enhanced success feedback
        setToastMessage(`Order #${orderId} placed successfully!`);
        setToastType('success');
        setShowToast(true);
        
        // Navigate with enhanced success flow
        setTimeout(() => {
          Alert.alert(
            t('checkout.orderPlaced'),
            `${t('checkout.orderPlacedMessage')}\nOrder ID: #${orderId}`,
            [
              {
                text: t('orders.viewOrders') || 'View Orders',
                onPress: () => {
                  navigation.reset({
                    index: 1,
                    routes: [
                      { name: 'Home' },
                      { name: 'Orders', params: { refresh: true } }
                    ],
                  });
                }
              },
              {
                text: t('common.ok'),
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                  });
                }
              }
            ]
          );
        }, 1000);
      } else {
        const errorMessage = response?.message || t('checkout.errorPlacingOrder');
        handleError('order', errorMessage, t('checkout.errorPlacingOrder'));
        setToastMessage(errorMessage);
        setToastType('error');
        setShowToast(true);
        HapticFeedback.error();
      }
    } catch (error) {
      console.error('Error placing order:', error);
      incrementRetry('order');
      const errorMessage = error instanceof Error ? error.message : t('checkout.errorPlacingOrder');
      handleError('order', error, t('checkout.errorPlacingOrder'));
      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
      HapticFeedback.error();
    } finally {
      setPlacingOrder(false);
    }
  };

  const renderAddressCard = (address: Address, isSelected: boolean) => {
    const cityName = isRTL ? address.city_title_ar : address.city_title_en;
    const areaName = isRTL ? address.area_title_ar : address.area_title_en;

    return (
      <View
        key={address.id}
        style={[styles.addressCard, isSelected && styles.selectedAddressCard]}
      >
        <TouchableOpacity
          style={styles.addressContent}
          onPress={() => {
            setSelectedAddress(address);
            setShowAddressModal(false);
          }}
        >
          <View style={styles.addressHeader}>
            <Text style={[styles.addressName, isRTL && styles.rtlText]}>
              {address.name}
            </Text>
            {isSelected && (
              <Icon name="checkmark-circle" size={20} color={Colors.primary} />
            )}
          </View>
          
          <Text style={[styles.addressDetails, isRTL && styles.rtlText]}>
            {address.building_no}, {cityName}, {areaName}
          </Text>
          
          {address.details && (
            <Text style={[styles.addressNotes, isRTL && styles.rtlText]}>
              {address.details}
            </Text>
          )}
          
          <Text style={[styles.deliveryFee, isRTL && styles.rtlText]}>
            {t('checkout.deliveryFee')}: ${(Number(address.delivery_fee) || 0).toFixed(2)}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.editAddressButton}
          onPress={() => navigation.navigate('AddressForm', {
            address: address,
            onSave: (updatedAddress: Address) => {
              setAddresses(prev => prev.map(addr => 
                addr.id === updatedAddress.id ? updatedAddress : addr
              ));
              if (selectedAddress?.id === updatedAddress.id) {
                setSelectedAddress(updatedAddress);
              }
            }
          })}
        >
          <Icon name="pencil" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    );
  };

  // Safety check for cart items
  if (!items || items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>{t('cart.empty')}</Text>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.continueButtonText}>
              {t('cart.continueShopping')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading screen during initial calculation
  if (loading && !orderCalculation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {t('checkout.calculating') || 'Calculating order...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error Banner Component
  const renderErrorBanner = () => {
    const activeErrors = Object.entries(errors).filter(([_, error]) => error !== null);
    
    if (activeErrors.length === 0) return null;

    return (
      <View style={styles.errorContainer}>
        {activeErrors.map(([type, message]) => (
          <View key={type} style={styles.errorBanner}>
            <View style={styles.errorContent}>
              <Icon name="warning-outline" size={20} color="#FF4757" />
              <Text style={styles.errorText}>{message}</Text>
            </View>
            <View style={styles.errorActions}>
              {canRetry(type as keyof typeof retryCount) && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    clearError(type as keyof typeof errors);
                    if (type === 'addresses') loadAddresses();
                    else if (type === 'calculation') calculateOrder();
                    else if (type === 'promoCode') validatePromoCode();
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => clearError(type as keyof typeof errors)}
              >
                <Icon name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.rtlContainer]}>
      {renderErrorBanner()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Branch Selection */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlSectionHeader]}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('checkout.branch') || 'Branch'}
            </Text>
            <TouchableOpacity onPress={() => setShowBranchModal(true)}>
              <Text style={[styles.changeButton, isRTL && styles.rtlText]}>
                {t('checkout.change')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.paymentMethodCard}>
            <Icon name="storefront" size={18} color="#007AFF" />
            <Text style={[styles.paymentMethodText, isRTL && styles.rtlText]}>
              {(() => {
                const b = branches.find(b => b.id === selectedBranchId) || branches[0];
                if (!b) return t('checkout.selectBranch') || 'Select a branch';
                const title = isRTL ? b.title_ar : b.title_en;
                return title || `#${b.id}`;
              })()}
            </Text>
          </View>
          {orderType === 'delivery' && (
            <Text style={[styles.helperText, isRTL && styles.rtlText]}>
              {t('checkout.deliveryFeeInfo')}
            </Text>
          )}
        </View>
        {/* Order Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('checkout.orderType')}
          </Text>
          
          <View style={styles.orderTypeContainer}>
            <TouchableOpacity
              style={[
                styles.orderTypeButton,
                orderType === 'delivery' && styles.selectedOrderType
              ]}
              onPress={() => setOrderType('delivery')}
            >
              <Icon name="bicycle" size={20} color={orderType === 'delivery' ? '#fff' : '#007AFF'} />
              <Text style={[
                styles.orderTypeText,
                orderType === 'delivery' && styles.selectedOrderTypeText,
                isRTL && styles.rtlText
              ]}>
                {t('checkout.delivery')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.orderTypeButton,
                orderType === 'pickup' && styles.selectedOrderType
              ]}
              onPress={() => setOrderType('pickup')}
            >
              <Icon name="storefront" size={20} color={orderType === 'pickup' ? '#fff' : '#007AFF'} />
              <Text style={[
                styles.orderTypeText,
                orderType === 'pickup' && styles.selectedOrderTypeText,
                isRTL && styles.rtlText
              ]}>
                {t('checkout.pickup')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guest Information */}
        {isGuest && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('checkout.contactInfo')}
            </Text>
            
            <View style={styles.guestFormContainer}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                  {t('auth.fullName')} *
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    isRTL && styles.rtlTextInput,
                    guestErrors.fullName && styles.inputError
                  ]}
                  value={guestInfo.fullName}
                  onChangeText={(text) => setGuestInfo(prev => ({ ...prev, fullName: text }))}
                  placeholder={t('auth.enterFullName')}
                  placeholderTextColor="#999"
                />
                {guestErrors.fullName && (
                  <Text style={[styles.errorText, isRTL && styles.rtlText]}>
                    {guestErrors.fullName}
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                  {t('auth.phone')} *
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    isRTL && styles.rtlTextInput,
                    guestErrors.phone && styles.inputError
                  ]}
                  value={guestInfo.phone}
                  onChangeText={(text) => setGuestInfo(prev => ({ ...prev, phone: text }))}
                  placeholder={t('auth.enterPhone')}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
                {guestErrors.phone && (
                  <Text style={[styles.errorText, isRTL && styles.rtlText]}>
                    {guestErrors.phone}
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                  {t('auth.email')}
                </Text>
                <TextInput
                  style={[styles.textInput, isRTL && styles.rtlTextInput]}
                  value={guestInfo.email}
                  onChangeText={(text) => setGuestInfo(prev => ({ ...prev, email: text }))}
                  placeholder={t('auth.enterEmail')}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {orderType === 'delivery' && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, isRTL && styles.rtlText]}>
                    {t('checkout.deliveryAddress')} *
                  </Text>
                  <TextInput
                    style={[
                      styles.textAreaInput,
                      isRTL && styles.rtlTextInput,
                      guestErrors.address && styles.inputError
                    ]}
                    value={guestInfo.address}
                    onChangeText={(text) => setGuestInfo(prev => ({ ...prev, address: text }))}
                    placeholder={t('checkout.enterDeliveryAddress')}
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                  {guestErrors.address && (
                    <Text style={[styles.errorText, isRTL && styles.rtlText]}>
                      {guestErrors.address}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Address Selection (for delivery) */}
        {orderType === 'delivery' && !isGuest && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, isRTL && styles.rtlSectionHeader]}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t('checkout.deliveryAddress')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddressModal(true)}>
                <Text style={[styles.changeButton, isRTL && styles.rtlText]}>
                  {t('checkout.change')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {loadingAddresses ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : selectedAddress ? (
              renderAddressCard(selectedAddress, true)
            ) : (
              <TouchableOpacity 
                style={styles.addAddressButton}
                onPress={() => navigation.navigate('AddressForm', {
                  onSave: (newAddress: Address) => {
                    setAddresses(prev => [...prev, newAddress]);
                    setSelectedAddress(newAddress);
                  }
                })}
              >
                <Icon name="add-circle-outline" size={24} color="#007AFF" />
                <Text style={[styles.addAddressText, isRTL && styles.rtlText]}>
                  {t('checkout.addAddress')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlSectionHeader]}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('checkout.paymentMethod')}
            </Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
              <Text style={[styles.changeButton, isRTL && styles.rtlText]}>
                {t('checkout.change')}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.paymentMethodCard}>
            <Icon 
              name={paymentMethods.find(p => p.id === paymentMethod)?.icon || 'cash-outline'} 
              size={24} 
              color="#007AFF" 
            />
            <Text style={[styles.paymentMethodText, isRTL && styles.rtlText]}>
              {paymentMethods.find(p => p.id === paymentMethod)?.title}
            </Text>
          </View>
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('checkout.promoCode')}
          </Text>
          
          {appliedPromo ? (
            <View style={styles.appliedPromoCard}>
              <View style={styles.appliedPromoInfo}>
                <Icon name="pricetag" size={20} color="#28a745" />
                <Text style={[styles.appliedPromoText, isRTL && styles.rtlText]}>
                  {appliedPromo.code} - {isRTL ? appliedPromo.title_ar : appliedPromo.title_en}
                </Text>
              </View>
              <TouchableOpacity onPress={removePromoCode}>
                <Icon name="close-circle" size={24} color="#FF4757" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoInputContainer}>
              <TextInput
                style={[styles.promoInput, isRTL && styles.rtlTextInput]}
                placeholder={t('checkout.enterPromoCode')}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
                editable={!validatingPromo}
              />
              <TouchableOpacity
                style={[styles.applyPromoButton, validatingPromo && styles.disabledButton]}
                onPress={validatePromoCode}
                disabled={validatingPromo || !promoCode.trim()}
              >
                {validatingPromo ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.applyPromoText}>{t('checkout.apply')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Special Instructions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('checkout.specialInstructions')}
          </Text>
          
          <TextInput
            style={[styles.instructionsInput, isRTL && styles.rtlTextInput]}
            placeholder={t('checkout.specialInstructionsPlaceholder')}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Order Summary */}
        {orderCalculation && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('checkout.orderSummary')}
            </Text>
            
            <View style={styles.summaryCard}>
              <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
                <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
                  {t('checkout.subtotal')}
                </Text>
                <Text style={[styles.summaryValue, isRTL && styles.rtlText]}>
                  ${orderCalculation.subtotal.toFixed(2)}
                </Text>
              </View>
              
              {orderType === 'delivery' && (
                <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
                  <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
                    {t('checkout.deliveryFee')}
                  </Text>
                  <Text style={[styles.summaryValue, isRTL && styles.rtlText]}>
                    ${(Number(orderCalculation.delivery_fee) || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              
              {/* Show discount: prefer waived shipping when free shipping applied; else regular discount */}
              {((orderCalculation as any).waived_delivery_fee > 0 || appliedPromo || lastValidatedPromoRef.current || orderCalculation.discount_amount > 0) && (
                <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
                  <Text style={[styles.summaryLabel, styles.discountLabel, isRTL && styles.rtlText]}>
                    {((orderCalculation as any).waived_delivery_fee > 0)
                      ? `${t('checkout.discount')} (${appliedPromo?.code || lastValidatedPromoRef.current?.code || 'FREESHIP'})`
                      : `${t('checkout.discount')}${(appliedPromo || lastValidatedPromoRef.current) ? ` (${(appliedPromo || lastValidatedPromoRef.current)?.code})` : ''}`}
                  </Text>
                  <Text style={[styles.summaryValue, styles.discountValue, isRTL && styles.rtlText]}>
                    -${(((orderCalculation as any).waived_delivery_fee > 0)
                          ? Number((orderCalculation as any).waived_delivery_fee || 0)
                          : (orderCalculation.discount_amount || calculatePromoDiscount((appliedPromo || lastValidatedPromoRef.current), orderCalculation.subtotal || 0))
                        ).toFixed(2)}
                  </Text>
                </View>
              )}
              
              <View style={[styles.summaryRow, styles.totalRow, isRTL && styles.rtlSummaryRow]}>
                <Text style={[styles.totalLabel, isRTL && styles.rtlText]}>
                  {t('checkout.total')}
                </Text>
                <Text style={[styles.totalValue, isRTL && styles.rtlText]}>
                  ${orderCalculation.total_amount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Enhanced Place Order Button */}
      <View style={styles.bottomContainer}>
        {/* Order Progress Indicator */}
        {!canPlaceOrder && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${orderProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {orderProgress < 100 ? `${orderProgress}% Complete` : 'Ready to place order!'}
            </Text>
          </View>
        )}
        
        <EnhancedButton
          title={placingOrder ? '' : t('checkout.placeOrder')}
          subtitle={!placingOrder && orderCalculation ? `$${orderCalculation.total_amount.toFixed(2)}` : undefined}
          onPress={placeOrder}
          loading={placingOrder}
          loadingText={t('checkout.placingOrder') || 'Placing your order...'}
          disabled={!canPlaceOrder || loading}
          variant={canPlaceOrder ? 'primary' : 'secondary'}
          size="large"
          icon={canPlaceOrder ? 'checkmark-circle' : 'alert-circle'}
          style={styles.placeOrderButtonEnhanced}
        />
        
        {!canPlaceOrder && (
          <Text style={styles.requirementsText}>
            {(() => {
              if (!items || items.length === 0) return 'Add items to your cart';
              if (orderType === 'delivery' && isGuest && !guestInfo.address.trim()) return 'Enter delivery address';
              if (orderType === 'delivery' && !isGuest && !selectedAddress) return 'Select delivery address';
              if (isGuest && (!guestInfo.fullName.trim() || !guestInfo.phone.trim())) return 'Complete contact information';
              if (!selectedBranchId && !branches[0]?.id) return 'Select a branch';
              if (!orderCalculation || orderCalculation.total_amount <= 0) return 'Wait for order calculation';
              return 'Complete all requirements';
            })()}
          </Text>
        )}
      </View>

      {/* Enhanced Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        duration={4000}
        onHide={() => setShowToast(false)}
      />

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, isRTL && styles.rtlModalHeader]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {t('checkout.selectAddress')}
            </Text>
            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {(addresses || []).map(address => renderAddressCard(address, address?.id === selectedAddress?.id))}
            
            <TouchableOpacity 
              style={styles.addNewAddressButton}
              onPress={() => navigation.navigate('AddressForm', {
                onSave: (newAddress: Address) => {
                  setAddresses(prev => [...(prev || []), newAddress]);
                  setSelectedAddress(newAddress);
                }
              })}
            >
              <Icon name="add-circle" size={24} color="#007AFF" />
              <Text style={[styles.addNewAddressText, isRTL && styles.rtlText]}>
                {t('checkout.addNewAddress')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, isRTL && styles.rtlModalHeader]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {t('checkout.selectPaymentMethod')}
            </Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            {(paymentMethods || []).map(method => (
              <TouchableOpacity
                key={method?.id}
                style={[styles.paymentOptionCard, paymentMethod === method?.id && styles.selectedPaymentOption]}
                onPress={() => {
                  setPaymentMethod(method?.id);
                  setShowPaymentModal(false);
                }}
              >
                <Icon name={method?.icon || 'cash-outline'} size={24} color="#007AFF" />
                <Text style={[styles.paymentOptionText, isRTL && styles.rtlText]}>
                  {method.title}
                </Text>
                {paymentMethod === method.id && (
                  <Icon name="checkmark-circle" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Branch Selection Modal */}
      <Modal
        visible={showBranchModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, isRTL && styles.rtlModalHeader]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {t('checkout.selectBranch') || 'Select Branch'}
            </Text>
            <TouchableOpacity onPress={() => setShowBranchModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            {(branches || []).map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.paymentOptionCard, selectedBranchId === b.id && styles.selectedPaymentOption]}
                onPress={() => {
                  setSelectedBranchId(b.id);
                  setShowBranchModal(false);
                  // Recalculate when branch changes (affects fee)
                  setTimeout(() => calculateOrder(), 50);
                }}
              >
                <Icon name="storefront" size={22} color="#007AFF" />
                <Text style={[styles.paymentOptionText, isRTL && styles.rtlText]}>
                  {(isRTL ? b.title_ar : b.title_en) || `#${b.id}`}
                </Text>
                {selectedBranchId === b.id && (
                  <Icon name="checkmark-circle" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 5,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  rtlSectionHeader: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  changeButton: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
  
  // Order Type Styles
  orderTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  orderTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  selectedOrderType: {
    backgroundColor: '#007AFF',
  },
  orderTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  selectedOrderTypeText: {
    color: '#fff',
  },
  
  // Address Styles
  addressCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAddressCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addressDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  addressNotes: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  deliveryFee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  addressContent: {
    flex: 1,
  },
  editAddressButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addAddressText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Payment Method Styles
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  
  // Promo Code Styles
  promoInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  promoInput: {
    flex: 1,
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
  applyPromoButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyPromoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appliedPromoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  appliedPromoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appliedPromoText: {
    fontSize: 14,
    color: '#28a745',
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Instructions Styles
  instructionsInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
  },
  
  // Summary Styles
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rtlSummaryRow: {
    flexDirection: 'row-reverse',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  discountLabel: {
    color: '#28a745',
  },
  discountValue: {
    color: '#28a745',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  
  // Bottom Container
  bottomContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  placeOrderButtonEnhanced: {
    marginBottom: 8,
  },
  requirementsText: {
    fontSize: 12,
    color: '#dc3545',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  placeOrderButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 18,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeOrderAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
  modalContent: {
    flex: 1,
    padding: 15,
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 15,
  },
  addNewAddressText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  paymentOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  
  // Guest Form Styles
  guestFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff4757',
  },
  errorText: {
    color: '#ff4757',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Error Banner Styles
  errorContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#FF4757',
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
  },
  errorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
});

export default CheckoutScreen;
