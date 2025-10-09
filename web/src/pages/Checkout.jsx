import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, addressesAPI, branchesAPI, promosAPI, shippingAPI, paymentsAPI } from '../services/api';
import LocationPicker from '../components/LocationPicker';
import Toast from '../components/Toast';
import './Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  
  const [addresses, setAddresses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('delivery'); // delivery or pickup
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash or card
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [orderCalculation, setOrderCalculation] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [stockWarnings, setStockWarnings] = useState([]);
  const [branchAvailability, setBranchAvailability] = useState({});
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);
  
  // Guest checkout state
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    latitude: null,
    longitude: null
  });
  
  // Phone number for logged-in users without phone
  const [userPhone, setUserPhone] = useState('');

  // Track calculation requests to prevent stale responses - match mobile
  const calcRequestRef = useRef(0);

  // New address form
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showGuestLocationPicker, setShowGuestLocationPicker] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    building: '',
    floor: '',
    apartment: '',
    notes: '',
    latitude: null,
    longitude: null
  });

  // Utility functions from mobile implementation
  const parseNumericValue = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') {
      return Number.isNaN(value) ? 0 : value;
    }
    const parsed = parseFloat(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const normalizeOrderCalculation = (raw) => {
    return {
      ...(raw || {}),
      items: Array.isArray(raw?.items) ? raw.items : [],
      subtotal: parseNumericValue(raw?.subtotal),
      delivery_fee: parseNumericValue(raw?.delivery_fee),
      delivery_fee_original: raw?.delivery_fee_original !== undefined ? parseNumericValue(raw?.delivery_fee_original) : undefined,
      tax_amount: parseNumericValue(raw?.tax_amount),
      discount_amount: parseNumericValue(raw?.discount_amount),
      shipping_discount_amount: raw?.shipping_discount_amount !== undefined ? parseNumericValue(raw?.shipping_discount_amount) : undefined,
      total_amount: parseNumericValue(raw?.total_amount),
      points_earned: parseNumericValue(raw?.points_earned),
      promo_details: raw?.promo_details,
      delivery_calculation_method: raw?.delivery_calculation_method || raw?.deliveryCalculation?.calculation_method,
    };
  };

  const calculatePromoDiscount = (promo, orderTotal) => {
    if (!promo) return 0;

    // Free shipping promos don't have a regular discount amount
    // The discount is applied to the delivery fee separately
    if (promo.discount_type === 'free_shipping') {
      return 0;
    }

    const total = parseNumericValue(orderTotal);
    const discountValue = parseNumericValue(promo.discount_value);
    const maxDiscount = promo.max_discount_amount !== undefined ? parseNumericValue(promo.max_discount_amount) : undefined;
    const minOrder = promo.min_order_amount !== undefined ? parseNumericValue(promo.min_order_amount) : 0;

    if (minOrder > 0 && total < minOrder) {
      return 0;
    }

    let savings = 0;

    switch (promo.discount_type) {
      case 'percentage': {
        savings = (discountValue / 100) * total;
        break;
      }
      case 'fixed':
      case 'fixed_amount': {
        savings = discountValue;
        break;
      }
      default: {
        savings = discountValue;
      }
    }

    savings = Math.max(0, savings);

    if (promo.discount_type !== 'free_shipping' && maxDiscount && maxDiscount > 0) {
      savings = Math.min(savings, maxDiscount);
    }

    return Math.min(savings, total);
  };

  // Toast helper function
  const showToast = (message, variant = 'success') => {
    const id = Date.now();
    const newToast = { id, message, variant };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 2000);
  };

  useEffect(() => {
    if (!user) {
      // Enable guest checkout instead of redirecting to login
      setIsGuestCheckout(true);
      // Load branches for guest users
      loadBranchesForGuest();
    } else {
      setIsGuestCheckout(false);
      // Initialize user phone from user data and fetch fresh data
      fetchUserDataAndPhone();
      fetchData();
    }
  }, [user, navigate]);

  const fetchUserDataAndPhone = async () => {
    try {
      // Fetch fresh user data to get the latest phone number
      const userResponse = await authAPI.getCurrentUser();
      const userData = userResponse.data.data?.user || userResponse.data.user;
      console.log('👤 Fetched user data for checkout:', userData);
      
      // Set phone number from fresh user data
      setUserPhone(userData?.phone || user?.phone || user?.mobile || '');
    } catch (err) {
      console.error('Error fetching user data:', err);
      // Fallback to context user data if API call fails
      setUserPhone(user?.phone || user?.mobile || '');
    }
  };

  const loadBranchesForGuest = async () => {
    try {
      const branchesRes = await branchesAPI.getAll();
      const fetchedBranches = branchesRes.data.data || branchesRes.data.branches || [];
      console.log('🏢 Guest checkout - Fetched branches:', fetchedBranches);
      setBranches(fetchedBranches);
      if (fetchedBranches.length > 0) {
        setSelectedBranch(fetchedBranches[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching branches for guest:', err);
      setError('Failed to load branches');
    }
  };

  // Wait a moment for cart to load from localStorage before checking if empty
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only redirect if not initial load and cart is truly empty and we're not in the process of placing an order
    if (!isInitialLoad && cart.length === 0 && !isPlacingOrder) {
      console.log('⚠️ Cart is empty, redirecting to /cart');
      navigate('/cart');
    }
  }, [cart, navigate, isInitialLoad, isPlacingOrder]);

  // Calculate order whenever relevant fields change - match mobile
  useEffect(() => {
    if (cart.length > 0 && branches.length > 0) {
      checkAllBranchesAvailability();
      calculateOrder();
    }
  }, [deliveryMethod, selectedAddress, selectedBranch, appliedPromo, branches, cart, guestInfo]);

  // Check availability for all branches - match mobile
  const checkAllBranchesAvailability = async () => {
    if (!cart || cart.length === 0 || !branches || branches.length === 0) {
      return;
    }

    try {
      const availabilityData = {
        items: cart.map(item => ({
          product_id: item.id,
          variant_id: item.variant?.id || null,
          quantity: item.quantity || 1,
        })),
        branch_ids: branches.map(b => b.id),
      };

      console.log('🔍 Checking all branches availability:', availabilityData);
      const response = await ordersAPI.checkBranchAvailability(availabilityData);
      console.log('🔍 All branches availability response:', response);

      const branchesData = response?.data?.data?.branches || response?.data?.branches || [];
      
      // Create a map of branch_id -> status
      const availabilityMap = {};
      branchesData.forEach(branchData => {
        const status = branchData.status || 'unknown';
        const minRemaining = branchData.min_remaining !== undefined ? branchData.min_remaining : null;
        
        let tone = 'available';
        let label = 'Available';
        
        if (status === 'unavailable') {
          tone = 'unavailable';
          label = 'Unavailable';
        } else if (status === 'inactive') {
          tone = 'inactive';
          label = 'Inactive';
        } else if (status === 'available') {
          if (minRemaining !== null && minRemaining <= 0) {
            tone = 'warning';
            label = 'Last Units';
          } else if (minRemaining !== null && minRemaining <= 2) {
            tone = 'limited';
            label = 'Limited Stock';
          }
        }
        
        availabilityMap[branchData.branch_id] = {
          status,
          tone,
          label,
          minRemaining,
          issues: branchData.issues || [],
          message: branchData.message
        };
      });

      setBranchAvailability(availabilityMap);
    } catch (error) {
      console.warn('⚠️ Could not check all branches availability:', error);
    }
  };

  const calculateOrder = async () => {
    const requestId = ++calcRequestRef.current;
    
    console.log('🔍 calculateOrder called with:', {
      cartLength: cart?.length,
      branchesLength: branches?.length,
      selectedBranch,
      deliveryMethod,
      selectedAddress
    });
    
    if (!cart || cart.length === 0) {
      console.log('⏭️ Skipping calculation: Empty cart');
      setLoading(false);
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

    // Make sure we have branches loaded
    if (!branches || branches.length === 0) {
      console.log('⏳ Waiting for branches to load...');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // For delivery orders, ensure we have a branch before calculating
      if (deliveryMethod === 'delivery') {
        const branchIdReady = selectedBranch || (branches[0]?.id ?? null);
        if (!branchIdReady) {
          console.log('⏳ Waiting for branches to load before calculation...');
          setLoading(false);
          return;
        }
      }

      // Check stock availability first to provide better error messages
      const branchId = selectedBranch ? parseInt(selectedBranch) : (branches[0]?.id ?? undefined);
      if (branchId) {
        try {
          const availabilityData = {
            branch_id: branchId,
            items: cart.map(item => ({
              product_id: item.id,
              variant_id: item.variant?.id || null,
              quantity: item.quantity || 1,
            })),
          };
          
          console.log('🔍 Checking stock availability:', availabilityData);
          const availabilityResponse = await ordersAPI.checkBranchAvailability(availabilityData);
          console.log('🔍 Stock availability response:', availabilityResponse);
          
          // If any items are unavailable, show specific error with product names
          if (availabilityResponse?.data?.unavailable_items && availabilityResponse.data.unavailable_items.length > 0) {
            const unavailableItems = availabilityResponse.data.unavailable_items;
            const warnings = unavailableItems.map(item => {
              const cartItem = cart.find(c => c.id === item.product_id);
              const productName = cartItem?.title || cartItem?.name || `Product #${item.product_id}`;
              const variantName = item.variant_id && cartItem?.variant?.title 
                ? ` (${cartItem.variant.title})` 
                : '';
              return `${productName}${variantName}`;
            });
            
            setStockWarnings(warnings);
            setError(null); // Clear generic error
            setLoading(false);
            return;
          } else {
            // Clear warnings if all items are available
            setStockWarnings([]);
          }
        } catch (availError) {
          console.warn('⚠️ Could not check stock availability:', availError);
          // Continue with calculation even if availability check fails
        }
      }
      const requestData = {
        items: (cart || []).map(item => {
          const mappedItem = {
            product_id: item.id,
            variant_id: item.variant?.id || null,
            quantity: item.quantity || 1,
            special_instructions: item.special_instructions,
          };
          console.log('📦 Mapping cart item:', {
            original: item,
            mapped: mappedItem,
            title: item.title_en || item.title_ar || item.name
          });
          return mappedItem;
        }),
        delivery_address_id: deliveryMethod === 'delivery' && selectedAddress && !isGuestCheckout ? parseInt(selectedAddress) : undefined,
        branch_id: selectedBranch ? parseInt(selectedBranch) : (branches[0]?.id ?? undefined),
        order_type: deliveryMethod,
        promo_code: appliedPromo?.code,
        is_guest: isGuestCheckout,
      };

      console.log('📊 Full request data:', requestData);
      console.log('🎫 Promo code being sent:', requestData.promo_code, 'from appliedPromo:', appliedPromo);

      // Provide explicit coordinates when available to improve backend delivery fee calculation
      if (deliveryMethod === 'delivery') {
        // For guest users with location coordinates
        if (isGuestCheckout && guestInfo.latitude && guestInfo.longitude) {
          const parsedLat = Number(guestInfo.latitude);
          const parsedLng = Number(guestInfo.longitude);
          
          if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng) && (parsedLat !== 0 || parsedLng !== 0)) {
            requestData.delivery_coordinates = {
              latitude: parsedLat,
              longitude: parsedLng
            };
            console.log('🗺️ Using guest location coordinates:', requestData.delivery_coordinates);
          }
        }
        // For logged-in users with selected address
        else if (!isGuestCheckout && selectedAddress) {
          const address = addresses.find(a => a.id === parseInt(selectedAddress));
          if (address) {
            const addressLat = address.latitude ?? address.lat;
            const addressLng = address.longitude ?? address.lng;
            const addressAreaId = address.area_id ?? address.areaId ?? address.area?.id;

            const parsedLat = addressLat !== undefined && addressLat !== null && addressLat !== ''
              ? Number(addressLat)
              : NaN;
            const parsedLng = addressLng !== undefined && addressLng !== null && addressLng !== ''
              ? Number(addressLng)
              : NaN;
            const parsedAreaId = addressAreaId !== undefined && addressAreaId !== null && addressAreaId !== ''
              ? Number(addressAreaId)
              : undefined;

            if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng) && (parsedLat !== 0 || parsedLng !== 0)) {
              requestData.delivery_coordinates = {
                latitude: parsedLat,
                longitude: parsedLng,
                area_id: Number.isFinite(parsedAreaId) ? parsedAreaId : undefined,
              };
              console.log('🗺️ Using user address coordinates:', requestData.delivery_coordinates);
            }
          }
        }
      }

      console.log(`📊 Order calculation request [#${requestId}]:`, JSON.stringify(requestData, null, 2));
      console.log('🛒 Current cart items:', cart.map(item => ({
        id: item.id,
        title: item.title_en || item.title_ar || item.name,
        quantity: item.quantity
      })));
      console.log('🎫 Applied promo state:', appliedPromo);
      console.log('📍 Guest location:', isGuestCheckout ? { lat: guestInfo.latitude, lng: guestInfo.longitude } : 'N/A');

      const response = await ordersAPI.calculate(requestData);
      
      console.log(`📊 Order calculation response [#${requestId}]:`, JSON.stringify(response, null, 2));
      console.log('💰 Response discount_amount:', response?.data?.data?.discount_amount);
      console.log('🚚 Response delivery_fee:', response?.data?.data?.delivery_fee);
      
      // Check if this is still the latest request (prevent stale responses)
      if (requestId !== calcRequestRef.current) {
        console.log(`⏭️ Skipping stale calculation response [#${requestId}]`);
        return;
      }

      if (response?.data?.success && response?.data?.data) {
        const rawCalcData = response.data.data;
        let calc = normalizeOrderCalculation(rawCalcData);

        console.log(`✅ Setting order calculation [#${requestId}]:`, calc);
        console.log('💰 Backend discount:', calc.discount_amount);
        console.log('🚚 Backend delivery fee:', calc.delivery_fee);
        console.log('🎫 Backend promo details:', calc.promo_details);
        console.log('🎫 Frontend appliedPromo state:', appliedPromo);

        // If we have an applied promo but no discount from backend, calculate it locally
        if (appliedPromo && calc.discount_amount === 0) {
          console.log('⚠️ Backend returned no discount, calculating locally...');
          console.log('📊 Calculating discount with subtotal:', calc.subtotal);
          const localDiscount = calculatePromoDiscount(appliedPromo, calc.subtotal);
          console.log('💰 Local discount calculation:', localDiscount);

          calc = {
            ...calc,
            discount_amount: localDiscount,
            total_amount: calc.subtotal + calc.delivery_fee - localDiscount + calc.tax_amount,
            promo_details: appliedPromo,
          };
          console.log('✅ Updated calc with local discount:', calc);
        }

        setOrderCalculation(calc);
        console.log('✅ OrderCalculation state updated');
      } else {
        console.warn('⚠️ Unexpected response format:', response);
      }
    } catch (error) {
      console.error('❌ Error calculating order:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || error.message;
      
      // Check if it's a stock availability error and extract product info
      if (errorMessage.includes('not available at branch') || errorMessage.includes('insufficient stock')) {
        // Extract branch ID from error message if present
        const branchMatch = errorMessage.match(/branch\s+(\d+)/i);
        const extractedBranchId = branchMatch ? parseInt(branchMatch[1]) : parseInt(selectedBranch);
        const branchName = branches.find(b => b.id === extractedBranchId)?.name || 
                          branches.find(b => b.id === extractedBranchId)?.title_en || 
                          `Branch #${extractedBranchId}`;
        
        // Try to parse product ID from error message
        const productMatch = errorMessage.match(/product(?:\s+with)?\s+id\s*(\d+)/i);
        const variantMatch = errorMessage.match(/variant(?:\s+with)?\s+id\s*(\d+)/i);
        
        const warnings = [];
        
        if (productMatch) {
          const productId = parseInt(productMatch[1]);
          const cartItem = cart.find(c => c.id === productId);
          if (cartItem) {
            const productName = cartItem?.title_en || cartItem?.title_ar || cartItem?.name || `Product #${productId}`;
            const variantName = variantMatch && cartItem?.variant?.title 
              ? ` (${cartItem.variant.title})` 
              : '';
            warnings.push(`${productName}${variantName}`);
          }
        } else {
          // If no product ID in message, show all cart items as potentially unavailable
          cart.forEach(item => {
            const productName = item?.title_en || item?.title_ar || item?.name || `Product #${item.id}`;
            const variantName = item.variant?.title ? ` (${item.variant.title})` : '';
            warnings.push(`${productName}${variantName}`);
          });
        }
        
        if (warnings.length > 0) {
          setStockWarnings(warnings);
          setError(null);
        } else {
          setError(`Some items in your cart are not available at ${branchName}.`);
          setStockWarnings([]);
        }
      } else {
        setError(`Failed to calculate order totals: ${errorMessage}`);
        setStockWarnings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [addressesRes, branchesRes] = await Promise.all([
        addressesAPI.getAll(),
        branchesAPI.getAll()
      ]);
      
      console.log('📍 Checkout - Address response:', addressesRes);
      console.log('📍 Checkout - Address response.data:', addressesRes.data);
      console.log('📍 Checkout - Address response.data.data:', addressesRes.data.data);
      
      console.log('🏢 Checkout - Branch response:', branchesRes);
      console.log('🏢 Checkout - Branch response.data:', branchesRes.data);
      
      // Backend returns: { success: true, data: [...branches...], pagination: {...} }
      const fetchedAddresses = addressesRes.data.data || addressesRes.data.addresses || [];
      // Backend returns: { success: true, data: [...branches...], pagination: {...} }
      const fetchedBranches = branchesRes.data.data || branchesRes.data.branches || [];
      
      console.log('📍 Fetched addresses:', fetchedAddresses);
      console.log('🏢 Fetched branches:', fetchedBranches);
      
      setAddresses(fetchedAddresses);
      setBranches(fetchedBranches);
      
      if (fetchedAddresses.length > 0) {
        setSelectedAddress(fetchedAddresses[0].id.toString());
      }
      if (fetchedBranches.length > 0) {
        setSelectedBranch(fetchedBranches[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      console.error('Error response:', err.response);
      setError('Failed to load checkout data');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const response = await addressesAPI.create(newAddress);
      
      // Backend returns: { success: true, data: { address: {...} } }
      const createdAddress = response.data.data?.address || response.data.address;
      
      setAddresses([...addresses, createdAddress]);
      setSelectedAddress(createdAddress.id.toString());
      setShowNewAddressForm(false);
      setShowLocationPicker(false);
      setNewAddress({ 
        street: '', 
        city: '', 
        building: '', 
        floor: '', 
        apartment: '', 
        notes: '',
        latitude: null,
        longitude: null
      });
    } catch (err) {
      console.error('Error adding address:', err);
      showToast('Failed to add address', 'error');
    }
  };

  const handleLocationSelect = (locationData) => {
    setNewAddress({
      ...newAddress,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      street: locationData.address
    });
    setShowLocationPicker(false);
  };

  const handleGuestLocationSelect = (locationData) => {
    setGuestInfo({
      ...guestInfo,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      address: locationData.address || guestInfo.address
    });
    setShowGuestLocationPicker(false);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setAppliedPromo(null);
      setError(null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎫 Validating promo code:', promoCode.trim(), 'with total:', getCartTotal());
      
      // Use guest validation endpoint if user is not logged in
      const response = isGuestCheckout 
        ? await promosAPI.validateGuest(promoCode, getCartTotal())
        : await promosAPI.validate(promoCode);
      
      console.log('🎫 Promo validation response:', response);
      
      // Backend returns: { success: true, valid: true, promo: {...} }
      if (response.data.valid || response.data.success) {
        const promoData = response.data.data?.promo || response.data.promo || {
          code: promoCode,
          discount_type: 'fixed',
          discount_value: response.data.discount || response.data.discount_amount || 0,
          max_discount_amount: response.data.max_discount,
          min_order_amount: response.data.min_order
        };
        
        console.log('✅ Promo validation successful:', promoData);
        
        setAppliedPromo(promoData);
        setError(null);
        
        // Calculate expected discount to show in success message
        const expectedDiscount = calculatePromoDiscount(promoData, getCartTotal());
        const discountAmount = response.data.discount_amount || expectedDiscount;
        
        // Show success message with Toast
        const successMsg = `Promo code applied! You're saving ${discountAmount.toFixed(2)} JOD`;
        showToast(successMsg, 'success');
        
        // Recalculate order with promo immediately
        // Note: We rely on the useEffect to trigger calculateOrder when appliedPromo changes
        console.log('🔄 Order will recalculate via useEffect when appliedPromo state updates...');
      } else {
        throw new Error(response.data.message || 'Invalid promo code');
      }
    } catch (err) {
      console.error('❌ Error validating promo code:', err);
      setAppliedPromo(null);
      const errorMessage = err.response?.data?.message || err.message || 'Invalid promo code';
      setError(`Promo code error: ${errorMessage}`);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePromo = () => {
    console.log('🗑️ Removing promo code...');
    setPromoCode('');
    setAppliedPromo(null);
    setError(null);
    
    // Order will recalculate via useEffect when appliedPromo changes to null
    console.log('🔄 Order will recalculate via useEffect when appliedPromo state updates...');
  };

  const handlePlaceOrder = async () => {
    // Validate guest information if guest checkout
    if (isGuestCheckout) {
      if (!guestInfo.name || !guestInfo.phone) {
        setError('Please provide your name and phone number');
        return;
      }
      if (deliveryMethod === 'delivery' && !guestInfo.address) {
        setError('Please provide your delivery address');
        return;
      }
    } else {
      // Validate logged-in user phone number
      if (!userPhone || userPhone.trim() === '') {
        setError('Please enter your phone number in the Contact Information section');
        return;
      }
    }
    
    if (deliveryMethod === 'delivery' && !isGuestCheckout && !selectedAddress) {
      setError('Please select a delivery address');
      return;
    }
    if (deliveryMethod === 'pickup' && !selectedBranch) {
      setError('Please select a pickup branch');
      return;
    }
    if (!selectedBranch) {
      setError('Please select a branch');
      return;
    }

    setLoading(true);
    setError('');
    setIsPlacingOrder(true); // Prevent cart empty redirect

    try {
      // First, check stock availability for the selected branch
      const stockCheckData = {
        items: cart.map(item => ({
          product_id: item.id,
          variant_id: item.variant?.id || null,
          quantity: item.quantity
        })),
        branch_ids: [parseInt(selectedBranch)]
      };

      const stockResponse = await ordersAPI.checkBranchAvailability(stockCheckData);
      const branchAvailability = stockResponse.data.data?.branches || stockResponse.data.branches || [];
      
      // Find the selected branch's availability
      const selectedBranchAvailability = branchAvailability.find(
        b => b.branch_id === parseInt(selectedBranch)
      );

      if (!selectedBranchAvailability || selectedBranchAvailability.status !== 'available') {
        const issues = selectedBranchAvailability?.issues || ['Items are not available at this branch'];
        setError(`Stock unavailable: ${issues.join(', ')}`);
        setLoading(false);
        setIsPlacingOrder(false); // Reset flag on stock error
        return;
      }

      // Proceed with order if stock is available - use prices from calculation
      const orderData = {
        items: cart.map((item, index) => {
          // Try to get price from calculation response, fallback to item data
          const calcItem = orderCalculation?.items?.[index];
          const unitPrice = calcItem?.unit_price !== undefined 
            ? parseNumericValue(calcItem.unit_price)
            : (item.variant ? parseNumericValue(item.variant.price) : (parseNumericValue(item.final_price) || parseNumericValue(item.base_price) || 0));

          return {
            product_id: item.id,
            variant_id: item.variant?.id || null,
            quantity: item.quantity,
            price: unitPrice,
            special_instructions: item.special_instructions || null
          };
        }),
        order_type: deliveryMethod, // 'delivery' or 'pickup'
        delivery_address_id: deliveryMethod === 'delivery' && !isGuestCheckout ? parseInt(selectedAddress) : null,
        branch_id: parseInt(selectedBranch), // Required for both delivery and pickup
        payment_method: paymentMethod,
        promo_code: appliedPromo?.code || null,
        notes: notes,
        // Include customer information (required by backend)
        customer_name: isGuestCheckout ? guestInfo.name : (user?.name || user?.full_name || user?.email?.split('@')[0] || 'Customer'),
        customer_phone: isGuestCheckout ? guestInfo.phone : userPhone,
        customer_email: isGuestCheckout ? guestInfo.email : (user?.email || ''),
        // For guest delivery orders, include address with location coordinates
        ...(isGuestCheckout && deliveryMethod === 'delivery' && {
          guest_delivery_address: JSON.stringify({
            address: guestInfo.address,
            latitude: guestInfo.latitude,
            longitude: guestInfo.longitude
          })
        }),
        // Include totals from calculation
        subtotal: orderCalculation?.subtotal || getCartTotal(),
        delivery_fee: orderCalculation?.delivery_fee || 0,
        discount_amount: orderCalculation?.discount_amount || 0,
        tax_amount: orderCalculation?.tax_amount || 0,
        total_amount: orderCalculation?.total_amount || calculateTotal()
      };

      const response = await ordersAPI.create(orderData);
      
      // Backend returns: { success: true, data: { order: {...} } }
      const orderId = response.data.data?.order?.id || response.data.data?.id;
      
      if (!orderId) {
        throw new Error('Order ID not received from server');
      }

      // If payment method is card, redirect to payment gateway
      if (paymentMethod === 'card') {
        try {
          const paymentResponse = await paymentsAPI.createSession(orderId);
          
          console.log('💳 Payment session response:', paymentResponse.data);
          
          if (paymentResponse.data.success && (paymentResponse.data.checkoutUrl || paymentResponse.data.redirectUrl)) {
            // Redirect to payment gateway using the checkout URL
            const paymentUrl = paymentResponse.data.checkoutUrl || paymentResponse.data.redirectUrl;
            console.log('💳 Redirecting to payment URL:', paymentUrl);
            window.location.href = paymentUrl;
            return;
          } else {
            throw new Error('Failed to initialize payment session');
          }
        } catch (paymentErr) {
          console.error('Payment initialization error:', paymentErr);
          console.error('Payment error response:', paymentErr.response?.data);
          setError('Failed to initialize payment. Please try again or use cash payment.');
          setLoading(false);
          setIsPlacingOrder(false); // Reset flag on payment error
          return;
        }
      }
      
      // For cash payment, clear cart and navigate to confirmation
      clearCart();
      
      // For guest users, store order details in localStorage for confirmation page
      if (isGuestCheckout) {
        const guestOrderInfo = {
          orderId: orderId,
          orderNumber: response.data.data?.order?.order_number,
          customerName: guestInfo.name,
          customerPhone: guestInfo.phone,
          customerEmail: guestInfo.email,
          orderType: deliveryMethod,
          paymentMethod: paymentMethod,
          total: orderCalculation?.total_amount || calculateTotal(),
          timestamp: Date.now()
        };
        localStorage.setItem('guestOrderInfo', JSON.stringify(guestOrderInfo));
        console.log('💾 Guest order info stored:', guestOrderInfo);
      }
      
      navigate(`/order-confirmation/${orderId}`);
    } catch (err) {
      console.error('Error placing order:', err);
      setError(err.response?.data?.message || 'Failed to place order');
      setIsPlacingOrder(false); // Reset flag on error
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    // Use orderCalculation if available, otherwise fallback to manual calculation
    if (orderCalculation) {
      return orderCalculation.total_amount;
    }
    
    const subtotal = getCartTotal();
    const delivery = deliveryMethod === 'delivery' ? 0 : 0;
    const discount = appliedPromo ? calculatePromoDiscount(appliedPromo, subtotal) : 0;
    return subtotal + delivery - discount;
  };

  // Check if all required fields are completed and items are available
  const isCheckoutValid = () => {
    // Check if cart has items
    if (!cart || cart.length === 0) {
      return false;
    }

    // Check if branch is selected
    if (!selectedBranch) {
      return false;
    }

    // Check guest information if guest checkout
    if (isGuestCheckout) {
      if (!guestInfo.name || !guestInfo.phone) {
        return false;
      }
      if (deliveryMethod === 'delivery' && !guestInfo.address) {
        return false;
      }
      // For delivery orders, verify location is picked from map
      if (deliveryMethod === 'delivery' && (!guestInfo.latitude || !guestInfo.longitude)) {
        return false;
      }
    } else {
      // Check if logged-in user has phone number
      if (!userPhone || userPhone.trim() === '') {
        return false;
      }
    }

    // Check if delivery address is selected (for delivery orders with logged-in users)
    if (!isGuestCheckout && deliveryMethod === 'delivery' && !selectedAddress) {
      return false;
    }

    // For delivery orders, verify delivery fee is calculated
    if (deliveryMethod === 'delivery') {
      // Check if order calculation exists and has delivery fee > 0
      if (!orderCalculation || !orderCalculation.delivery_fee || orderCalculation.delivery_fee <= 0) {
        return false;
      }
    }

    // Check if there are any stock warnings (items not available)
    if (stockWarnings.length > 0) {
      return false;
    }

    // Check if selected branch is available
    if (selectedBranch && branchAvailability[parseInt(selectedBranch)]) {
      const branchStatus = branchAvailability[parseInt(selectedBranch)];
      if (branchStatus.tone === 'unavailable' || branchStatus.tone === 'inactive') {
        return false;
      }
    }

    // Check if payment method is selected
    if (!paymentMethod) {
      return false;
    }

    return true;
  };

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>Checkout</h1>

        {error && <div className="error-message">{error}</div>}
        
        {/* Stock Warnings Banner - matches mobile UX */}
        {stockWarnings.length > 0 && (
          <div className="stock-warning-banner">
            <div className="stock-warning-header">
              <i className="fa fa-exclamation-triangle"></i>
              <strong>Items Not Available</strong>
            </div>
            <div className="stock-warning-body">
              <p>The following items are not available at the selected branch:</p>
              <ul>
                {stockWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
              <p className="stock-warning-suggestion">
                <i className="fa fa-lightbulb"></i> Try selecting a different branch or remove these items from your cart.
              </p>
            </div>
          </div>
        )}

        <div className="checkout-content">
          <div className="checkout-main">
            {/* Guest Information Form */}
            {isGuestCheckout && (
              <section className="checkout-section">
                <h2>
                  <i className="fa fa-user"></i> Your Information
                </h2>
                <div className="guest-info-form">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                    className="guest-input"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={guestInfo.phone}
                    onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                    className="guest-input"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    className="guest-input"
                  />
                  <p className="helper-text">
                    <i className="fa fa-info-circle"></i> We'll use this information to contact you about your order
                  </p>
                </div>
              </section>
            )}
            
            {/* Phone Number for Logged-in Users */}
            {!isGuestCheckout && (
              <section className="checkout-section">
                <h2>
                  <i className="fa fa-phone"></i> Contact Information
                </h2>
                <div className="user-phone-form">
                  <input
                    type="tel"
                    placeholder="Phone Number (e.g., 0791234567) *"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="guest-input"
                    required
                    pattern="[0-9]*"
                  />
                  <p className="helper-text">
                    <i className="fa fa-info-circle"></i> Required to process and deliver your order
                  </p>
                  {!userPhone && (
                    <p className="warning-text">
                      <i className="fa fa-exclamation-triangle"></i> Please enter your phone number to complete checkout
                    </p>
                  )}
                </div>
              </section>
            )}
            
            {/* Branch Selection - Always show for both pickup and delivery */}
            <section className="checkout-section">
              <h2>
                <i className="fa fa-store"></i> Select Branch
              </h2>
              {branches.length > 0 ? (
                <div className="branch-selector">
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="branch-select"
                  >
                    {branches.map((branch) => {
                      const availability = branchAvailability[branch.id] || { label: '', tone: 'unknown' };
                      const branchName = branch.title_en || branch.title_ar || branch.name || `Branch #${branch.id}`;
                      const statusLabel = availability.label ? ` - ${availability.label}` : '';
                      
                      return (
                        <option 
                          key={branch.id} 
                          value={branch.id}
                          disabled={availability.tone === 'unavailable' || availability.tone === 'inactive'}
                        >
                          {branchName}{statusLabel}
                          {deliveryMethod === 'delivery' && branch.delivery_fee && ` - Delivery: $${branch.delivery_fee}`}
                        </option>
                      );
                    })}
                  </select>
                  
                  {/* Show current branch status */}
                  {selectedBranch && branchAvailability[parseInt(selectedBranch)] && (
                    <div className={`branch-status-info ${branchAvailability[parseInt(selectedBranch)].tone}`}>
                      <i className={`fa ${
                        branchAvailability[parseInt(selectedBranch)].tone === 'available' ? 'fa-check-circle' :
                        branchAvailability[parseInt(selectedBranch)].tone === 'limited' ? 'fa-exclamation-circle' :
                        branchAvailability[parseInt(selectedBranch)].tone === 'warning' ? 'fa-exclamation-triangle' :
                        branchAvailability[parseInt(selectedBranch)].tone === 'unavailable' ? 'fa-times-circle' :
                        'fa-info-circle'
                      }`}></i>
                      <span>{branchAvailability[parseInt(selectedBranch)].label}</span>
                      {branchAvailability[parseInt(selectedBranch)].minRemaining !== null && 
                       branchAvailability[parseInt(selectedBranch)].minRemaining <= 2 && (
                        <span> - Only {branchAvailability[parseInt(selectedBranch)].minRemaining} left in stock</span>
                      )}
                    </div>
                  )}
                  
                  {deliveryMethod === 'delivery' && (
                    <p className="helper-text">
                      <i className="fa fa-info-circle"></i> Delivery fee will be calculated based on distance
                    </p>
                  )}
                </div>
              ) : (
                <p>Loading branches...</p>
              )}
            </section>

            {/* Delivery Method */}
            <section className="checkout-section">
              <h2>Delivery Method</h2>
              <div className="delivery-methods">
                <label className={`method-option ${deliveryMethod === 'delivery' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="delivery"
                    checked={deliveryMethod === 'delivery'}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                  />
                  <i className="fa fa-bicycle"></i>
                  <span>Home Delivery</span>
                </label>
                <label className={`method-option ${deliveryMethod === 'pickup' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="pickup"
                    checked={deliveryMethod === 'pickup'}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                  />
                  <i className="fa fa-store"></i>
                  <span>Pickup from Branch</span>
                </label>
              </div>
            </section>

            {/* Address or Branch Selection */}
            {deliveryMethod === 'delivery' ? (
              <section className="checkout-section">
                <h2>Delivery Address</h2>
                {isGuestCheckout ? (
                  <div className="guest-address-form">
                    <button
                      type="button"
                      onClick={() => setShowGuestLocationPicker(!showGuestLocationPicker)}
                      className="pick-location-btn"
                    >
                      <i className="fa fa-map-marker-alt"></i> {showGuestLocationPicker ? 'Hide Map' : 'Pick Location on Map'}
                    </button>

                    {showGuestLocationPicker && (
                      <LocationPicker onLocationSelect={handleGuestLocationSelect} />
                    )}

                    {guestInfo.latitude && guestInfo.longitude && (
                      <div className="location-selected">
                        <i className="fa fa-check-circle"></i> Location selected: {guestInfo.latitude.toFixed(6)}, {guestInfo.longitude.toFixed(6)}
                      </div>
                    )}

                    <textarea
                      placeholder="Enter your full delivery address *"
                      value={guestInfo.address}
                      onChange={(e) => setGuestInfo({ ...guestInfo, address: e.target.value })}
                      className="guest-address-textarea"
                      rows="4"
                      required
                    />
                    <p className="helper-text">
                      <i className="fa fa-map-marker"></i> Include street, building number, floor, and any landmarks
                    </p>
                  </div>
                ) : addresses.length > 0 ? (
                  <>
                    <select
                      value={selectedAddress}
                      onChange={(e) => setSelectedAddress(e.target.value)}
                      className="address-select"
                    >
                      {addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.name || 'Address'} - {address.building_no || ''} {address.area_title_en || address.city_title_en || ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                      className="add-address-btn"
                    >
                      {showNewAddressForm ? 'Cancel' : '+ Add New Address'}
                    </button>
                  </>
                ) : (
                  <>
                    <p>No saved addresses</p>
                    <button
                      onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                      className="add-address-btn"
                    >
                      {showNewAddressForm ? 'Cancel' : '+ Add New Address'}
                    </button>
                  </>
                )}

                {!isGuestCheckout && showNewAddressForm && (
                  <form onSubmit={handleAddAddress} className="new-address-form">
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(!showLocationPicker)}
                      className="pick-location-btn"
                    >
                      <i className="fa fa-map-marker"></i> {showLocationPicker ? 'Hide Map' : 'Pick Location on Map'}
                    </button>

                    {showLocationPicker && (
                      <LocationPicker onLocationSelect={handleLocationSelect} />
                    )}

                    <input
                      type="text"
                      placeholder="Street"
                      value={newAddress.street}
                      onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Building"
                      value={newAddress.building}
                      onChange={(e) => setNewAddress({ ...newAddress, building: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Floor"
                      value={newAddress.floor}
                      onChange={(e) => setNewAddress({ ...newAddress, floor: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Apartment"
                      value={newAddress.apartment}
                      onChange={(e) => setNewAddress({ ...newAddress, apartment: e.target.value })}
                    />
                    {newAddress.latitude && newAddress.longitude && (
                      <div className="location-selected">
                        <i className="fa fa-check-circle"></i> Location selected: {newAddress.latitude.toFixed(6)}, {newAddress.longitude.toFixed(6)}
                      </div>
                    )}
                    <button type="submit" className="submit-address-btn">Save Address</button>
                  </form>
                )}
              </section>
            ) : null}

            {/* Payment Method */}
            <section className="checkout-section">
              <h2>Payment Method</h2>
              <div className="payment-methods">
                <label className={`method-option ${paymentMethod === 'cash' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <i className="fa fa-money"></i>
                  <span>Cash on Delivery</span>
                </label>
                <label className={`method-option ${paymentMethod === 'card' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <i className="fa fa-credit-card"></i>
                  <span>Credit/Debit Card</span>
                </label>
              </div>
            </section>

            {/* Order Notes */}
            <section className="checkout-section">
              <h2>Order Notes (Optional)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for your order?"
                rows="4"
                className="notes-textarea"
              />
            </section>
          </div>

          {/* Order Summary */}
          <div className="checkout-sidebar">
            <div className="order-summary">
              <h2>Order Summary</h2>
              
              <div className="summary-items">
                {cart.map((item) => {
                  const unitPrice = item.variant ? parseNumericValue(item.variant.price) : (parseNumericValue(item.final_price) || parseNumericValue(item.base_price) || 0);
                  return (
                    <div key={`${item.id}-${item.variant?.id || 'default'}`} className="summary-item">
                      <span>
                        {item.title_en || item.title_ar} 
                        {item.variant && ` (${item.variant.title_en || item.variant.title_ar || item.variant.title})`} 
                        x{item.quantity}
                      </span>
                      <span>{(unitPrice * item.quantity).toFixed(2)} JOD</span>
                    </div>
                  );
                })}
              </div>

              <div className="promo-code-section">
                {appliedPromo ? (
                  <div className="applied-promo">
                    <div className="promo-details">
                      <i className="fa fa-ticket"></i>
                      <span className="promo-code-text">{appliedPromo.code}</span>
                      {appliedPromo.discount_type === 'free_shipping' ? (
                        <span className="promo-discount">
                          {orderCalculation?.shipping_discount_amount > 0 
                            ? `-${orderCalculation.shipping_discount_amount.toFixed(2)} JOD (Free Shipping)`
                            : 'Free Shipping'}
                        </span>
                      ) : (
                        <span className="promo-discount">-{calculatePromoDiscount(appliedPromo, getCartTotal()).toFixed(2)} JOD</span>
                      )}
                    </div>
                    <button onClick={handleRemovePromo} className="remove-promo-btn">
                      <i className="fa fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Enter Promo Code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleApplyPromo()}
                      className="promo-input"
                      disabled={loading}
                    />
                    <button 
                      onClick={handleApplyPromo} 
                      className="apply-promo-btn"
                      disabled={loading || !promoCode.trim()}
                    >
                      {loading ? 'Validating...' : 'Apply'}
                    </button>
                  </>
                )}
              </div>

              <div className="summary-totals">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{(orderCalculation?.subtotal || getCartTotal()).toFixed(2)} JOD</span>
                </div>
                {deliveryMethod === 'delivery' && (
                  <div className="summary-row">
                    <span>
                      Delivery Fee
                      {orderCalculation?.delivery_calculation_method && ` (${orderCalculation.delivery_calculation_method})`}
                      {loading && ' (Calculating...)'}
                    </span>
                    <span>{(orderCalculation?.delivery_fee || 0).toFixed(2)} JOD</span>
                  </div>
                )}
                {orderCalculation?.tax_amount > 0 && (
                  <div className="summary-row">
                    <span>Tax</span>
                    <span>{orderCalculation.tax_amount.toFixed(2)} JOD</span>
                  </div>
                )}
                {/* Show discount line only for non-free-shipping promos */}
                {(orderCalculation?.discount_amount > 0 || (appliedPromo && appliedPromo.discount_type !== 'free_shipping')) && orderCalculation?.discount_amount > 0 && (
                  <div className="summary-row discount">
                    <span>Discount {appliedPromo && `(${appliedPromo.code})`}</span>
                    <span>-{(orderCalculation?.discount_amount || 0).toFixed(2)} JOD</span>
                  </div>
                )}
                {/* Show shipping discount for free shipping promos */}
                {orderCalculation?.shipping_discount_amount > 0 && (
                  <div className="summary-row discount">
                    <span>Shipping Discount {appliedPromo && appliedPromo.discount_type === 'free_shipping' && `(${appliedPromo.code})`}</span>
                    <span>-{orderCalculation.shipping_discount_amount.toFixed(2)} JOD</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Total</span>
                  <span>{calculateTotal().toFixed(2)} JOD</span>
                </div>
              </div>

              {/* Validation message when checkout is not ready */}
              {!isCheckoutValid() && (
                <div className="checkout-validation-message">
                  <i className="fa fa-info-circle"></i>
                  <span>
                    {stockWarnings.length > 0
                      ? 'Please resolve stock availability issues before placing your order'
                      : isGuestCheckout && (!guestInfo.name || !guestInfo.phone)
                      ? 'Please provide your name and phone number'
                      : !isGuestCheckout && (!userPhone || userPhone.trim() === '')
                      ? 'Please provide your phone number'
                      : isGuestCheckout && deliveryMethod === 'delivery' && (!guestInfo.latitude || !guestInfo.longitude)
                      ? 'Please pick your delivery location on the map'
                      : isGuestCheckout && deliveryMethod === 'delivery' && !guestInfo.address
                      ? 'Please provide your delivery address'
                      : deliveryMethod === 'delivery' && (!orderCalculation || !orderCalculation.delivery_fee || orderCalculation.delivery_fee <= 0)
                      ? 'Calculating delivery fee... Please wait'
                      : deliveryMethod === 'delivery' && !isGuestCheckout && !selectedAddress
                      ? 'Please select a delivery address'
                      : !selectedBranch
                      ? 'Please select a branch'
                      : selectedBranch && branchAvailability[parseInt(selectedBranch)] && 
                        (branchAvailability[parseInt(selectedBranch)].tone === 'unavailable' || 
                         branchAvailability[parseInt(selectedBranch)].tone === 'inactive')
                      ? 'Selected branch is not available'
                      : 'Please complete all required fields'}
                  </span>
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !isCheckoutValid()}
                className="place-order-btn"
                title={
                  !isCheckoutValid() 
                    ? stockWarnings.length > 0
                      ? 'Some items are not available at the selected branch'
                      : deliveryMethod === 'delivery' && !selectedAddress
                      ? 'Please select a delivery address'
                      : !selectedBranch
                      ? 'Please select a branch'
                      : 'Please complete all required fields'
                    : ''
                }
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast 
          key={toast.id} 
          message={toast.message} 
          variant={toast.variant}
        />
      ))}
    </div>
  );
};

export default Checkout;
