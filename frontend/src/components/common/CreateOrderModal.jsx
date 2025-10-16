import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  InputNumber,
  Button,
  Space,
  Divider,
  Card,
  Table,
  message,
  AutoComplete,
  Tag,
  Typography,
  Steps,
  DatePicker
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
  SaveOutlined,
  SearchOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import EnhancedAddressForm from './EnhancedAddressForm';
import customersService from '../../services/customersService';
import productsService from '../../services/productsService';
import ordersService from '../../services/ordersService';
import branchesService from '../../services/branchesService';
import paymentsService from '../../services/paymentsService';
import promosService from '../../services/promosService';

const { Option } = Select;
const { Text } = Typography;
const { Step } = Steps;

const CreateOrderModal = ({ visible, onCancel, onSuccess, t }) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [addressForm] = Form.useForm();
  const [customerForm] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Customer data
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  
  // Branch data
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branch, setBranch] = useState(''); // For order creation branch selection
  
  // Product data
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [branchInventory, setBranchInventory] = useState({}); // Store branch inventory by product_id
  
  // Variant selection modal
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  
  // Order preferences
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderType, setOrderType] = useState('delivery');
  const [customDeliveryFee, setCustomDeliveryFee] = useState(null);
  const [isDeliveryFeeEditing, setIsDeliveryFeeEditing] = useState(false);
  
  // Track previous orderType to detect actual changes
  const prevOrderTypeRef = useRef('delivery');
  
  // Location data for new address
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [streets, setStreets] = useState([]);
  
  // Order totals
  const [orderTotals, setOrderTotals] = useState({
    subtotal: 0,
    delivery_fee: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0
  });

  // Promo code states
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);

  // Helper function to format price
  const formatPrice = (price) => {
    const numPrice = parseFloat(price) || 0;
    return new Intl.NumberFormat('en-JO', {
      style: 'currency',
      currency: 'JOD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currencyDisplay: 'code'
    }).format(numPrice);
  };

  useEffect(() => {
    if (visible) {
      loadCustomers();
      loadProducts();
      loadCities();
      loadBranches();
    }
  }, [visible]);

  // Prevent step out-of-bounds when orderType changes
  useEffect(() => {
    // Only run if orderType actually changed
    if (prevOrderTypeRef.current !== orderType) {
      const prevOrderType = prevOrderTypeRef.current;
      
      // Only adjust step when switching FROM delivery TO pickup (which has fewer steps)
      if (prevOrderType === 'delivery' && orderType === 'pickup') {
        // For pickup orders: only 2 steps (0: Customer, 1: Products)
        // If currently on step 2 (Products in delivery mode), move to step 1 (Products in pickup mode)
        if (currentStep === 2) {
          setCurrentStep(1);
        }
        // If on step 1 (Address in delivery mode), it stays step 1 but becomes Products
        // No adjustment needed for step 0 (Customer)
      }
      // No adjustment when switching FROM pickup TO delivery - it supports all steps
      
      // Update the ref for next time
      prevOrderTypeRef.current = orderType;
    }
  }, [orderType]);

  // Cache products when successfully loaded
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('cached_products', JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerAddresses(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    calculateOrderTotals();
  }, [selectedProducts, selectedAddress, useNewAddress, selectedBranch]);

  // Reload products when branch is selected to get branch-specific inventory
  useEffect(() => {
    if (selectedBranch && visible) {
      loadProductsForBranch(selectedBranch.id);
    }
  }, [selectedBranch?.id, visible]);

  useEffect(() => {
    if (useNewAddress) {
      // Recalculate when address form changes (debounced)
      const timeout = setTimeout(() => {
        calculateOrderTotals();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [useNewAddress]);

  const loadCustomers = async () => {
    try {
      const response = await customersService.getCustomers({ 
        limit: 100,
        active: true 
      });
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      message.error(t ? t('orders.loadCustomersError') : 'Failed to load customers');
    }
  };

  const loadCustomerAddresses = async (customerId) => {
    try {
      const response = await customersService.getAddresses({ user_id: customerId });
      setCustomerAddresses(response.data || []);
    } catch (error) {
      console.error('Error loading customer addresses:', error);
      message.error(t ? t('orders.loadAddressesError') : 'Failed to load addresses');
    }
  };

  const loadProducts = async () => {
    try {
      setSearchingProducts(true);
      const response = await productsService.getProducts({ 
        limit: 1000,
        include_inactive: false,
        include_branch_inventory: true // Request branch inventory data
      });
      const productsData = response.data || [];
      console.log('Loaded products in CreateOrderModal:', productsData.length);
      
      // If the API doesn't return branch_inventory, we need to fetch it separately for each product
      // For now, we'll use the products as-is and the UI will show status based on what's available
      setProducts(productsData);
      
      // If no products loaded, try again with a simpler request
      if (productsData.length === 0) {
        console.warn('No products found, trying fallback request...');
        const fallbackResponse = await productsService.getProducts();
        const fallbackData = fallbackResponse.data || [];
        console.log('Fallback products loaded:', fallbackData.length);
        setProducts(fallbackData);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      message.error(t ? t('orders.loadProductsError') : 'Failed to load products');
      
      // Try to maintain products from a parent component or local storage as fallback
      const existingProducts = JSON.parse(localStorage.getItem('cached_products') || '[]');
      if (existingProducts.length > 0) {
        console.log('Using cached products as fallback:', existingProducts.length);
        setProducts(existingProducts);
      }
    } finally {
      setSearchingProducts(false);
    }
  };

  const loadProductsForBranch = async (branchId) => {
    if (!branchId) return;
    
    try {
      setSearchingProducts(true);
      const response = await productsService.getProducts({ 
        limit: 1000,
        include_inactive: false,
        branch_id: branchId,
        branch_availability: 'all' // Get all products, including unavailable ones
      });
      const productsData = response.data || [];
      console.log(`Loaded ${productsData.length} products for branch ${branchId}`);
      
      // Store branch inventory info
      const inventory = {};
      productsData.forEach(product => {
        inventory[product.id] = {
          is_available: product.branch_is_available,
          stock_quantity: product.branch_stock_quantity || 0,
          stock_status: product.branch_stock_status
        };
      });
      setBranchInventory(inventory);
      
      // Update products list
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products for branch:', error);
    } finally {
      setSearchingProducts(false);
    }
  };

  const loadCities = async () => {
    try {
      const response = await customersService.getCities();
      setCities(response.data || []);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await branchesService.getBranches({ active: true });
      setBranches(response.data || []);
      // Auto-select first branch if available
      if (response.data && response.data.length > 0) {
        setSelectedBranch(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      message.error(t ? t('orders.loadBranchesError') : 'Failed to load branches');
    }
  };

  const loadAreas = async (cityId) => {
    try {
      const response = await customersService.getAreas(cityId);
      setAreas(response.data || []);
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const loadStreets = async (areaId) => {
    try {
      const response = await customersService.getStreets(areaId);
      setStreets(response.data || []);
    } catch (error) {
      console.error('Error loading streets:', error);
    }
  };

  // Find matching city/area/street from database based on map address
  const findLocationMatches = async (addressData) => {
    try {
      // Try to find matching city
      const citiesResponse = await customersService.getCities();
      const allCities = citiesResponse.data || [];
      
      // Look for city match in the address components
      let matchedCity = null;
      if (addressData.city) {
        matchedCity = allCities.find(city => 
          city.title_en.toLowerCase().includes(addressData.city.toLowerCase()) ||
          city.title_ar?.toLowerCase().includes(addressData.city.toLowerCase())
        );
      }
      
      const formValues = {};
      let locationMessage = [];
      
      if (matchedCity) {
        formValues.city_id = matchedCity.id;
        locationMessage.push(matchedCity.title_en);
        
        // Load areas for the matched city
        const areasResponse = await customersService.getAreas(matchedCity.id);
        const allAreas = areasResponse.data || [];
        setAreas(allAreas);
        
        // Try to find matching area
        let matchedArea = null;
        if (addressData.area || addressData.district) {
          const searchTerm = (addressData.area || addressData.district).toLowerCase();
          matchedArea = allAreas.find(area => 
            area.title_en.toLowerCase().includes(searchTerm) ||
            area.title_ar?.toLowerCase().includes(searchTerm)
          );
        }
        
        if (matchedArea) {
          formValues.area_id = matchedArea.id;
          locationMessage.push(matchedArea.title_en);
          
          // Load streets for the matched area
          const streetsResponse = await customersService.getStreets(matchedArea.id);
          const allStreets = streetsResponse.data || [];
          setStreets(allStreets);
          
          // Try to find matching street
          let matchedStreet = null;
          if (addressData.street || addressData.street_address) {
            const searchTerm = (addressData.street || addressData.street_address).toLowerCase();
            matchedStreet = allStreets.find(street => 
              street.title_en.toLowerCase().includes(searchTerm) ||
              street.title_ar?.toLowerCase().includes(searchTerm)
            );
          }
          
          if (matchedStreet) {
            formValues.street_id = matchedStreet.id;
            locationMessage.push(matchedStreet.title_en);
          }
        }
      }
      
      // Always set the form values (even if partial)
      addressForm.setFieldsValue(formValues);
      
      // Show appropriate message based on what was matched
      if (locationMessage.length > 0) {
        const fullMessage = `${t ? t('orders.locationMatched') : 'Location matched'}: ${locationMessage.join(' → ')}`;
        const partialHint = locationMessage.length < 3 ? 
          ` ${t ? t('orders.completeLocationManually') : '(Complete remaining fields manually if needed)'}` : '';
        message.success(fullMessage + partialHint);
      } else {
        message.info(
          t ? t('orders.noLocationMatch') : 
          'Location saved from map. You can optionally select city/area/street for better categorization.'
        );
      }
    } catch (error) {
      console.error('Error finding location matches:', error);
      message.info(
        t ? t('orders.locationSavedFromMap') : 
        'Location saved from map. You can optionally select city/area/street manually.'
      );
    }
  };

  const handleMapAddressChange = (addressData) => {
    // Auto-fill the address form and try to match locations
    findLocationMatches(addressData);
  };

  const handleAddressFormFinish = async (addressData) => {
    // This is called when the submit button in the address form is clicked
    // Create the address in the database
    try {
      setLoading(true);
      
      if (!selectedCustomer) {
        message.error(t ? t('orders.selectCustomerFirst') : 'Please select a customer first');
        return;
      }

      // Ensure we have required fields for address validation
      const addressPayload = {
        ...addressData,
        user_id: selectedCustomer.id,
        // Ensure phone is provided (required by backend)
        phone: addressData.phone || selectedCustomer.phone || '',
        // Ensure address_name is provided and at least 2 characters
        address_name: addressData.address_name || 'New Address',
        // Provide fallback values for location if not selected from dropdowns
        city: addressData.city_id ? undefined : (addressData.city || 'City'),
        area: addressData.area_id ? undefined : (addressData.area || 'Area'),
        street: addressData.street_id ? undefined : (addressData.street || 'Street'),
        // Ensure we have some form of location data
        details: addressData.details || addressData.address_line_1 || 'Address details'
      };

      const addressResponse = await customersService.createAddress(addressPayload);

      if (addressResponse.success) {
        // Add the new address to the customer's addresses
        const newAddress = addressResponse.data;
        setCustomerAddresses([...customerAddresses, newAddress]);
        
        // Select the newly created address
        setSelectedAddress(newAddress);
        setUseNewAddress(false);
        
        message.success(t ? t('orders.addressCreatedSuccess') : 'Address created successfully');
        
        // Reset the form
        addressForm.resetFields();
      } else {
        message.error(t ? t('orders.addressCreateError') : 'Failed to create address');
      }
    } catch (error) {
      console.error('Error creating address:', error);
      message.error(t ? t('orders.addressCreateError') : 'Failed to create address');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    setSelectedAddress(null);
    setUseNewAddress(false);
  };

  const handleCreateCustomer = async (customerData) => {
    try {
      setLoading(true);
      
      // Enhanced phone validation and formatting
      let formattedData = { ...customerData };
      
      // Clean and validate phone number
      if (formattedData.phone) {
        // Remove all non-digit characters
        let cleanPhone = formattedData.phone.replace(/\D/g, '');
        
        // Add country code if missing (assume Jordan +962)
        if (cleanPhone.length === 9 && cleanPhone.startsWith('7')) {
          cleanPhone = '962' + cleanPhone;
        } else if (cleanPhone.length === 10 && cleanPhone.startsWith('07')) {
          cleanPhone = '962' + cleanPhone.substring(1);
        }
        
        formattedData.phone = cleanPhone;
      }
      
      const response = await customersService.createCustomer({
        ...formattedData,
        is_active: true
      });

      if (response.success) {
        const newCustomer = response.data;
        setCustomers([...customers, newCustomer]);
        setSelectedCustomer(newCustomer);
        setShowCreateCustomer(false);
        customerForm.resetFields();
        
        message.success(t ? t('orders.customerCreatedSuccess') : 'Customer created successfully');
      } else {
        // Handle validation errors more specifically
        if (response.errors && Array.isArray(response.errors)) {
          const errorMessages = response.errors.join('\n');
          message.error({
            content: (
              <div>
                <strong>Validation Failed:</strong>
                <div style={{ marginTop: '8px', whiteSpace: 'pre-line' }}>
                  {errorMessages}
                </div>
              </div>
            ),
            duration: 6,
            style: { maxWidth: '400px' }
          });
        } else {
          message.error({
            content: response.message || (t ? t('orders.customerCreateError') : 'Failed to create customer'),
            duration: 4
          });
        }
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      
      // Enhanced error handling for different types of validation errors
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          // Handle validation errors array with better formatting
          message.error({
            content: (
              <div>
                <strong>{t ? t('common.validationFailed') : 'Validation Failed'}:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            ),
            duration: 8,
            style: { maxWidth: '450px' }
          });
        } else if (errorMessage) {
          // Handle single error message
          message.error({
            content: (
              <div>
                <strong>{t ? t('common.error') : 'Error'}:</strong>
                <div style={{ marginTop: '4px' }}>
                  {errorMessage}
                  {message_ar && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {message_ar}
                    </div>
                  )}
                </div>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(t ? t('orders.customerCreateError') : 'Failed to create customer');
        }
      } else if (error.message) {
        message.error({
          content: (
            <div>
              <strong>{t ? t('common.networkError') : 'Network Error'}:</strong>
              <div style={{ marginTop: '4px' }}>
                {error.message}
              </div>
            </div>
          ),
          duration: 5
        });
      } else {
        message.error(t ? t('orders.customerCreateError') : 'Failed to create customer');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (addressId) => {
    const address = customerAddresses.find(a => a.id === addressId);
    setSelectedAddress(address);
    setUseNewAddress(false);
  };

  const handleUseNewAddress = () => {
    setUseNewAddress(true);
    setSelectedAddress(null);
    addressForm.resetFields();
  };

  const addProduct = (productId, variantId = null) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Create a unique key for the product/variant combination
    const itemKey = variantId ? `${productId}_${variantId}` : `${productId}`;
    
    // Find if this exact product+variant combo already exists
    const existingIndex = selectedProducts.findIndex(p => {
      if (variantId) {
        return p.id === productId && p.variant_id === variantId;
      }
      return p.id === productId && !p.variant_id;
    });

    if (existingIndex > -1) {
      // Increase quantity if already exists
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setSelectedProducts(updated);
    } else {
      // Add new product or variant
      let price = parseFloat(product.sale_price || product.base_price || product.price || 0);
      let variantTitle = null;
      let variant = null;
      
      // If variant is selected, get variant details and adjust price
      if (variantId && product.variants && product.variants.length > 0) {
        variant = product.variants.find(v => v.id === variantId);
        if (variant) {
          variantTitle = variant.title_en || variant.title_ar || variant.variant_name || `Variant ${variantId}`;
          
          // Calculate variant price based on pricing strategy
          if (variant.pricing_strategy === 'fixed' && variant.price_value) {
            price = parseFloat(variant.price_value);
          } else if (variant.pricing_strategy === 'percentage' && variant.price_value) {
            const adjustment = price * (parseFloat(variant.price_value) / 100);
            price = price + adjustment;
          } else if (variant.pricing_strategy === 'addition' && variant.price_value) {
            price = price + parseFloat(variant.price_value);
          }
        }
      }

      setSelectedProducts([...selectedProducts, {
        ...product,
        variant_id: variantId,
        variant_title: variantTitle,
        variant_details: variant,
        name: product.title_en || product.name || 'Unknown Product',
        quantity: 1,
        price: price,
        total: price,
        _uniqueKey: itemKey // For React key tracking
      }]);
    }
  };

  // Calculate totals whenever products change
  useEffect(() => {
    const subtotal = selectedProducts.reduce((sum, product) => sum + (product.total || 0), 0);
    const deliveryFee = orderType === 'delivery' ? (customDeliveryFee || 0) : 0;
    const taxAmount = subtotal * 0.1; // 10% tax
    const discountAmount = appliedPromo?.discount || 0; // Use promo discount
    const totalAmount = subtotal + deliveryFee + taxAmount - discountAmount;

    setOrderTotals({
      subtotal,
      delivery_fee: deliveryFee,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount
    });
  }, [selectedProducts, customDeliveryFee, orderType, appliedPromo]);

  const updateProductQuantity = (productId, quantity, variantId = null) => {
    if (quantity <= 0) {
      removeProduct(productId, variantId);
      return;
    }

    const updated = selectedProducts.map(p => {
      const matches = variantId 
        ? (p.id === productId && p.variant_id === variantId)
        : (p.id === productId && !p.variant_id);
      
      return matches
        ? { ...p, quantity, total: quantity * p.price }
        : p;
    });
    setSelectedProducts(updated);
  };

  const removeProduct = (productId, variantId = null) => {
    setSelectedProducts(selectedProducts.filter(p => {
      if (variantId) {
        return !(p.id === productId && p.variant_id === variantId);
      }
      return !(p.id === productId && !p.variant_id);
    }));
  };

  const handleDeliveryFeeEdit = () => {
    setIsDeliveryFeeEditing(true);
  };

  const handleDeliveryFeeChange = (value) => {
    const fee = parseFloat(value) || 0;
    setCustomDeliveryFee(fee);
    
    // Recalculate totals with new delivery fee
    const newTotal = orderTotals.subtotal + fee + orderTotals.tax_amount - orderTotals.discount_amount;
    setOrderTotals({
      ...orderTotals,
      delivery_fee: fee,
      total_amount: newTotal
    });
  };

  const handleDeliveryFeeSave = () => {
    setIsDeliveryFeeEditing(false);
  };

  const resetDeliveryFee = () => {
    setCustomDeliveryFee(null);
    setIsDeliveryFeeEditing(false);
    // Trigger recalculation
    calculateOrderTotals();
  };

  // Promo code validation handler
  const handleValidatePromoCode = async () => {
    if (!promoCode.trim()) {
      message.warning(t ? t('orders.enter_promo_code') : 'Please enter a promo code');
      return;
    }

    setPromoLoading(true);
    setPromoValidation(null);

    try {
      const data = await promosService.validatePromoCode(promoCode.trim(), orderTotals.subtotal);
      console.log('Promo validation response:', data);

      if (data.success && data.data) {
        setPromoValidation({ type: 'success', message: data.message });
        setAppliedPromo({
          code: promoCode.trim().toUpperCase(),
          id: data.data.promo_code?.id || null, // promo_code is the promo object
          discount: parseFloat(data.data.discount_amount) || 0,
          final_total: parseFloat(data.data.final_total) || orderTotals.total_amount
        });

        // Update order totals with promo discount
        const promoDiscount = parseFloat(data.data.discount_amount) || 0;
        setOrderTotals(prev => ({
          ...prev,
          discount_amount: promoDiscount,
          total_amount: prev.subtotal + prev.delivery_fee + prev.tax_amount - promoDiscount
        }));

        message.success(data.message || (t ? t('orders.promo_applied') : 'Promo code applied successfully'));
      } else {
        const errorMsg = data.message || (t ? t('orders.invalid_promo') : 'Invalid promo code');
        setPromoValidation({ type: 'error', message: errorMsg });
        message.error(errorMsg);
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      const errorMsg = error.message || (t ? t('orders.promo_validation_error') : 'Failed to validate promo code');
      setPromoValidation({ 
        type: 'error', 
        message: errorMsg
      });
      message.error(errorMsg);
    } finally {
      setPromoLoading(false);
    }
  };

  // Remove promo code handler
  const handleRemovePromoCode = () => {
    setPromoCode('');
    setPromoValidation(null);
    setAppliedPromo(null);

    // Recalculate totals without promo
    setOrderTotals(prev => ({
      ...prev,
      discount_amount: 0,
      total_amount: prev.subtotal + prev.delivery_fee + prev.tax_amount
    }));

    message.info(t ? t('orders.promo_removed') : 'Promo code removed');
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, product) => sum + product.total, 0);
  };

  const calculateOrderTotals = async () => {
    if (selectedProducts.length === 0) {
      setOrderTotals({
        subtotal: 0,
        delivery_fee: customDeliveryFee || 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: customDeliveryFee || 0
      });
      return;
    }

    try {
      const orderData = {
        items: selectedProducts.map(p => ({
          product_id: p.id,
          variant_id: p.variant_id || null,
          quantity: p.quantity,
          price: p.price
        })),
        order_type: 'delivery',
        branch_id: selectedBranch?.id
      };

      // Add address information if available
      if (selectedAddress) {
        orderData.delivery_address_id = selectedAddress.id;
      } else if (useNewAddress) {
        const addressValues = addressForm.getFieldsValue();
        if (addressValues.latitude && addressValues.longitude) {
          orderData.guest_delivery_address = {
            latitude: addressValues.latitude,
            longitude: addressValues.longitude,
            area_id: addressValues.area_id || null
          };
          orderData.is_guest = false; // Not really guest, but using guest address format
        }
      }

      const response = await ordersService.calculateOrder(orderData);
      if (response.success) {
        const calculatedTotals = response.data;
        // Use custom delivery fee if set, otherwise use calculated fee
        const finalDeliveryFee = customDeliveryFee !== null ? customDeliveryFee : calculatedTotals.delivery_fee;
        const finalTotal = calculatedTotals.subtotal + finalDeliveryFee + calculatedTotals.tax_amount - calculatedTotals.discount_amount;
        
        setOrderTotals({
          ...calculatedTotals,
          delivery_fee: finalDeliveryFee,
          total_amount: finalTotal
        });
        
        // If no custom fee set yet, initialize with calculated fee
        if (customDeliveryFee === null) {
          setCustomDeliveryFee(calculatedTotals.delivery_fee);
        }
      }
    } catch (error) {
      console.error('Error calculating order totals:', error);
      
      // Check if it's a product availability error
      const errorMessage = error.response?.data?.message || error.message || '';
      if (errorMessage.includes('not available at branch')) {
        const branchName = selectedBranch?.name || `Branch ${selectedBranch?.id || ''}`;
        message.warning({
          content: `Some products are not available at ${branchName}. Please ensure all products are added to this branch's inventory or select a different branch.`,
          duration: 5
        });
      } else {
        message.error('Failed to calculate order totals: ' + errorMessage);
      }
      
      // Fallback to basic calculation
      const subtotal = calculateTotal();
      const finalDeliveryFee = customDeliveryFee || 0;
      setOrderTotals({
        subtotal,
        delivery_fee: finalDeliveryFee,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: subtotal + finalDeliveryFee
      });
    }
  };

  const validateStep = (step) => {
    const currentSteps = getSteps();
    const stepContent = currentSteps[step];
    
    // Check which step we're actually on based on the content
    if (stepContent.icon.type === UserOutlined) {
      // Customer and Branch selection step
      if (!selectedBranch) {
        message.error(t ? t('orders.selectBranchRequired') : 'Please select a branch');
        return false;
      }
      if (!selectedCustomer) {
        message.error(t ? t('orders.selectCustomerRequired') : 'Please select a customer');
        return false;
      }
      return true;
    } else if (stepContent.icon.type === EnvironmentOutlined) {
      // Address selection step (only for delivery orders)
      if (orderType === 'delivery') {
        if (!selectedAddress && !useNewAddress) {
          message.error(t ? t('orders.selectAddressRequired') : 'Please select an address or create a new one');
          return false;
        }
        if (useNewAddress) {
          // For new addresses, we only require name field
          // Everything else (coordinates, location IDs) is optional
          return addressForm.validateFields(['name'])
            .then(() => true)
            .catch(() => {
              message.error(t ? t('orders.addressNameRequired') : 'Address name is required');
              return false;
            });
        }
      }
      return true;
    } else if (stepContent.icon.type === ShoppingCartOutlined) {
      // Products selection step
      if (selectedProducts.length === 0) {
        message.error(t ? t('orders.selectProductsRequired') : 'Please add at least one product');
        return false;
      }
      // For pickup orders, ensure branch is selected
      if (orderType === 'pickup' && !branch) {
        message.error(t ? t('orders.selectBranchRequired') : 'Please select a pickup branch');
        return false;
      }
      return true;
    }
    
    return true;
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      let addressData = null;
      
      // Only handle address for delivery orders
      if (orderType === 'delivery') {
        addressData = selectedAddress;
        
        // If using new address and it hasn't been created yet, create it first
        if (useNewAddress && !selectedAddress) {
          const addressValues = await addressForm.validateFields();
          const addressResponse = await customersService.createAddress({
            ...addressValues,
            user_id: selectedCustomer.id,
            phone: addressValues.phone || selectedCustomer.phone || ''
          });
          addressData = addressResponse.data;
        }
      }

      // Validate required fields
      if (!selectedCustomer) {
        throw new Error('Customer is required');
      }
      if (selectedProducts.length === 0) {
        throw new Error('At least one product is required');
      }
      if (orderType === 'pickup' && !branch) {
        throw new Error('Branch selection is required for pickup orders');
      }
      if (orderType === 'delivery' && !addressData) {
        throw new Error('Delivery address is required');
      }

      // Create the order
      const orderData = {
        customer_id: selectedCustomer.id, // This identifies it as an admin-created order
        delivery_address_id: orderType === 'delivery' ? addressData?.id : null,
        pickup_branch: orderType === 'pickup' ? branch : null,
        branch_id: selectedBranch?.id || branches[0]?.id || 1, // Use selected branch or first available
        customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
        customer_phone: selectedCustomer.phone || '',
        customer_email: selectedCustomer.email || '',
        items: selectedProducts.map(p => ({
          product_id: p.id,
          variant_id: p.variant_id || null,
          quantity: p.quantity,
          price: p.price
        })),
        total_amount: orderTotals.total_amount,
        subtotal: orderTotals.subtotal,
        delivery_fee: orderType === 'delivery' ? (orderTotals.delivery_fee || customDeliveryFee || 0) : 0,
        tax_amount: orderTotals.tax_amount,
        discount_amount: orderTotals.discount_amount,
        promo_code: appliedPromo?.code || undefined, // Backend expects promo_code in request body
        order_status: 'pending',
        payment_status: 'pending',
        payment_method: paymentMethod,
        order_type: orderType
      };

      console.log('Creating order with data:', orderData);
      const response = await ordersService.create(orderData);
      console.log('Order creation response:', response);
      
      // If payment method is card, initiate MPGS payment
      if (paymentMethod === 'card') {
        try {
          message.success(t ? t('orders.createSuccess') : 'Order created successfully');
          message.loading(t ? t('orders.payment_redirecting') : 'Redirecting to payment gateway...', 2);
          
          // Create MPGS payment session
          const paymentResponse = await paymentsService.createMPGSCheckoutSession(
            response.data.order.id,
            response.data.order.total_amount,
            'JOD'
          );
          
          if (paymentResponse?.success) {
            const { sessionId, redirectUrl, checkoutUrl, testFormUrl, orderId, amount, currency } = paymentResponse;
            if (sessionId) {
              // Close modal first
              onSuccess?.();
              handleCancel();
              
              // Use the checkout URL from the new response format
              const urlToOpen = testFormUrl || checkoutUrl || redirectUrl;
              if (urlToOpen) {
                window.open(urlToOpen, '_blank', 'noopener,noreferrer,width=600,height=750');
              } else {
                navigate(`/payment-checkout?sessionId=${sessionId}&orderId=${orderId}&amount=${amount}&currency=${currency}`);
              }
              return;
            }
          }
          
          // If payment session creation fails, still show success for order creation
          message.warning(t ? t('orders.payment_session_failed') : 'Order created but payment session failed. You can pay from the orders list.');
          
        } catch (paymentError) {
          console.error('Payment session error:', paymentError);
          message.warning(t ? t('orders.payment_session_error') : 'Order created but payment setup failed. You can pay from the orders list.');
        }
      } else {
        message.success(t ? t('orders.createSuccess') : 'Order created successfully');
      }
      
      onSuccess?.();
      handleCancel();
    } catch (error) {
      console.error('Error creating order:', error);
      
      // Enhanced error handling
      let errorMessage = t ? t('orders.createError') : 'Failed to create order';
      
      if (error.response?.data) {
        const { message: serverMessage, errors } = error.response.data;
        if (errors && Array.isArray(errors)) {
          errorMessage = errors.join(', ');
        } else if (serverMessage) {
          errorMessage = serverMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check if it's a product availability error
      if (errorMessage.includes('not available at branch')) {
        const branchName = selectedBranch?.name || `Branch ${selectedBranch?.id || ''}`;
        message.error({
          content: (
            <div>
              <strong>Product Availability Issue</strong>
              <br />
              Some products are not available at {branchName}.
              <br />
              Please ensure all products are added to this branch's inventory or select a different branch.
            </div>
          ),
          duration: 6
        });
      } else {
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    addressForm.resetFields();
    setCurrentStep(0);
    setSelectedCustomer(null);
    setSelectedAddress(null);
    setSelectedBranch(null);
    setUseNewAddress(false);
    setSelectedProducts([]);
    setPaymentMethod('cash');
    setOrderType('delivery');
    setBranch('');
    setCustomDeliveryFee(null);
    setIsDeliveryFeeEditing(false);
    // Reset promo code states
    setPromoCode('');
    setPromoValidation(null);
    setAppliedPromo(null);
    onCancel();
  };

  const productColumns = [
    {
      title: t ? t('orders.product') : 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.variant_title && (
            <div style={{ fontSize: '12px', color: '#1890ff', marginTop: 2 }}>
              <Tag color="blue" size="small">{record.variant_title}</Tag>
            </div>
          )}
          {record.sku && <div style={{ fontSize: '12px', color: '#666' }}>SKU: {record.sku}</div>}
        </div>
      )
    },
    {
      title: t ? t('orders.price') : 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `${price.toFixed(2)} JOD`
    },
    {
      title: t ? t('orders.quantity') : 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity, record) => (
        <InputNumber
          min={1}
          value={quantity}
          onChange={(value) => updateProductQuantity(record.id, value, record.variant_id)}
          style={{ width: '80px' }}
        />
      )
    },
    {
      title: t ? t('orders.total') : 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total) => <Text strong>{total.toFixed(2)} JOD</Text>
    },
    {
      title: t ? t('common.actions') : 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          danger 
          size="small" 
          icon={<DeleteOutlined />}
          onClick={() => removeProduct(record.id, record.variant_id)}
        />
      )
    }
  ];

  const renderCustomerStep = () => (
    <div>
      <Form.Item 
        label={t ? t('orders.selectCustomer') : 'Select Customer'}
        required
      >
        <Space.Compact style={{ width: '100%' }}>
          <Select
            showSearch
            placeholder={t ? t('orders.searchCustomer') : 'Search by name, phone, or email...'}
            optionFilterProp="label"
            value={selectedCustomer?.id}
            onChange={handleCustomerSelect}
            style={{ flex: 1 }}
            filterOption={(input, option) => {
              if (!input) return true;
              const searchText = input.toLowerCase();
              const customer = customers.find(c => c.id === option.value);
              if (!customer) return false;
              
              // Search in name, phone, and email
              const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
              const phone = (customer.phone || '').toLowerCase();
              const email = (customer.email || '').toLowerCase();
              
              return fullName.includes(searchText) || 
                     phone.includes(searchText) || 
                     email.includes(searchText);
            }}
          >
            {customers.map(customer => (
              <Option 
                key={customer.id} 
                value={customer.id}
                label={`${customer.first_name} ${customer.last_name} ${customer.phone} ${customer.email}`}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {`${customer.first_name} ${customer.last_name}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    📞 {customer.phone} • ✉️ {customer.email}
                  </div>
                </div>
              </Option>
            ))}
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setShowCreateCustomer(true)}
          >
            {t ? t('orders.createCustomer') : 'Create'}
          </Button>
        </Space.Compact>
      </Form.Item>

      {/* Create Customer Modal */}
      <Modal
        title={t ? t('orders.createNewCustomer') : 'Create New Customer'}
        open={showCreateCustomer}
        onCancel={() => {
          setShowCreateCustomer(false);
          customerForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={customerForm}
          layout="vertical"
          onFinish={handleCreateCustomer}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="first_name"
                label={t ? t('customers.first_name') : 'First Name'}
                rules={[{ required: true, message: t ? t('customers.first_name_required') : 'First name is required' }]}
              >
                <Input placeholder={t ? t('customers.first_name_placeholder') : 'Enter first name'} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="last_name"
                label={t ? t('customers.last_name') : 'Last Name'}
                rules={[{ required: true, message: t ? t('customers.last_name_required') : 'Last name is required' }]}
              >
                <Input placeholder={t ? t('customers.last_name_placeholder') : 'Enter last name'} />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label={t ? t('customers.email') : 'Email'}
                rules={[
                  { required: true, message: t ? t('customers.email_required') : 'Email is required' },
                  { type: 'email', message: t ? t('customers.email_invalid') : 'Please enter a valid email' }
                ]}
              >
                <Input placeholder={t ? t('customers.email_placeholder') : 'Enter email address'} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label={t ? t('customers.phone') : 'Phone'}
                rules={[{ required: true, message: t ? t('customers.phone_required') : 'Phone is required' }]}
              >
                <Input 
                  placeholder={t ? t('customers.phone_placeholder') : 'Enter phone number (e.g., 0791234567)'} 
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="date_of_birth"
            label={t ? t('customers.date_of_birth') : 'Date of Birth'}
          >
            <DatePicker style={{ width: '100%' }} placeholder={t ? t('customers.date_of_birth_placeholder') : 'Select date of birth'} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setShowCreateCustomer(false);
                customerForm.resetFields();
              }}>
                {t ? t('common.cancel') : 'Cancel'}
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t ? t('customers.create_customer') : 'Create Customer'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {selectedCustomer && (
        <Card size="small" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined />
            <Text strong>{`${selectedCustomer.first_name} ${selectedCustomer.last_name}`}</Text>
            <Tag color="blue">{selectedCustomer.email}</Tag>
            {selectedCustomer.phone && <Tag>{selectedCustomer.phone}</Tag>}
          </div>
        </Card>
      )}
    </div>
  );

  const renderAddressStep = () => (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card 
            title={t ? t('orders.existingAddresses') : 'Existing Addresses'}
            size="small"
            style={{ height: '400px', overflow: 'auto' }}
          >
            {customerAddresses.length > 0 ? (
              customerAddresses.map(address => (
                <Card 
                  key={address.id}
                  size="small" 
                  style={{ 
                    marginBottom: 8,
                    border: selectedAddress?.id === address.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleAddressSelect(address.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <Text strong>{address.name}</Text>
                      {address.is_default && <Tag color="gold" size="small" style={{ marginLeft: 8 }}>Default</Tag>}
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                        {address.details}
                      </div>
                    </div>
                    {selectedAddress?.id === address.id && (
                      <Tag color="blue" size="small">Selected</Tag>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Text type="secondary">{t ? t('orders.noAddressesFound') : 'No addresses found'}</Text>
            )}
            
            <Button 
              type="dashed" 
              block 
              icon={<PlusOutlined />}
              style={{ marginTop: 16 }}
              onClick={handleUseNewAddress}
            >
              {t ? t('orders.addNewAddress') : 'Add New Address'}
            </Button>
          </Card>
        </Col>

        <Col span={12}>
          {useNewAddress ? (
            <Card title={t ? t('orders.newAddress') : 'New Address'} size="small">
              <EnhancedAddressForm
                form={addressForm}
                cities={cities}
                areas={areas}
                streets={streets}
                onCityChange={loadAreas}
                onAreaChange={loadStreets}
                onMapAddressChange={handleMapAddressChange}
                onFinish={handleAddressFormFinish}
                showMapFirst={true}
                t={t}
              />
            </Card>
          ) : selectedAddress ? (
            <Card title={t ? t('orders.selectedAddress') : 'Selected Address'} size="small">
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <EnvironmentOutlined style={{ color: '#52c41a' }} />
                  <Text strong>{selectedAddress.name}</Text>
                  {selectedAddress.is_default && <Tag color="gold" size="small">Default</Tag>}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  {selectedAddress.details}
                </div>
                {selectedAddress.latitude && selectedAddress.longitude && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                    <EnvironmentOutlined /> {parseFloat(selectedAddress.latitude).toFixed(6)}, {parseFloat(selectedAddress.longitude).toFixed(6)}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card title={t ? t('orders.selectAddress') : 'Select Address'} size="small">
              <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                <EnvironmentOutlined style={{ fontSize: 32, marginBottom: 16 }} />
                <div>{t ? t('orders.selectAddressHint') : 'Select an existing address or create a new one'}</div>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );

  const renderProductsStep = () => (
    <div>
      <Form.Item 
        label={t ? t('orders.selectBranch') : 'Select Branch'}
        required
        style={{ marginBottom: 16 }}
      >
        <Select
          placeholder={t ? t('orders.selectBranchPlaceholder') : 'Select a branch...'}
          value={selectedBranch?.id}
          onChange={(branchId) => {
            const branch = branches.find(b => b.id === branchId);
            setSelectedBranch(branch);
          }}
          showSearch
          optionFilterProp="children"
          optionLabelProp="label"
          filterOption={(input, option) => {
            const branch = branches.find(b => b.id === option.value);
            if (!branch) return false;
            const searchText = `${branch.title_en || ''} ${branch.title_ar || ''} ${branch.address_en || ''} ${branch.address_ar || ''}`.toLowerCase();
            return searchText.includes(input.toLowerCase());
          }}
        >
          {branches.map(branch => (
            <Option 
              key={branch.id} 
              value={branch.id}
              label={branch.title_en || branch.title_ar || `Branch ${branch.id}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ 
                    fontWeight: '500',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    lineHeight: '1.4'
                  }}>
                    {branch.title_en || branch.title_ar || `Branch ${branch.id}`}
                  </div>
                  {(branch.address_en || branch.address_ar) && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666', 
                      marginTop: '2px',
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      lineHeight: '1.3'
                    }}>
                      {branch.address_en || branch.address_ar}
                    </div>
                  )}
                </div>
                <Tag color={branch.is_active ? 'green' : 'red'} size="small">
                  {branch.is_active ? (t ? t('common.active') : 'Active') : (t ? t('common.inactive') : 'Inactive')}
                </Tag>
              </div>
            </Option>
          ))}
        </Select>
        {branches.length > 0 && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            {t ? t('orders.branchesAvailable') : `${branches.length} branches available`}
          </div>
        )}
      </Form.Item>

      {selectedBranch && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShopOutlined />
            <Text strong>{selectedBranch.title_en || selectedBranch.title_ar || `Branch ${selectedBranch.id}`}</Text>
            <Tag color={selectedBranch.is_active ? 'green' : 'red'} size="small">
              {selectedBranch.is_active ? (t ? t('common.active') : 'Active') : (t ? t('common.inactive') : 'Inactive')}
            </Tag>
          </div>
          {(selectedBranch.address_en || selectedBranch.address_ar) && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
              <EnvironmentOutlined /> {selectedBranch.address_en || selectedBranch.address_ar}
            </div>
          )}
          {selectedBranch.phone && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
              📞 {selectedBranch.phone}
            </div>
          )}
          {selectedBranch.email && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              ✉️ {selectedBranch.email}
            </div>
          )}
        </Card>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Card title={t ? t('orders.addProducts') : 'Add Products'} size="small">
            <Select
              showSearch
              placeholder={t ? t('orders.searchProducts') : 'Search for products...'}
              style={{ width: '100%', marginBottom: 16 }}
              optionFilterProp="label"
              loading={searchingProducts}
              onChange={async (productId) => {
                const product = products.find(p => p.id === productId);
                if (!product) return;
                
                // Check if product has variants loaded, if not fetch them
                if (!product.variants || product.variants.length === 0) {
                  try {
                    // Fetch full product details including variants
                    const fullProduct = await productsService.getProduct(productId);
                    if (fullProduct && fullProduct.data) {
                      const productData = fullProduct.data;
                      
                      // Update the product in the products list with variants
                      setProducts(prevProducts => 
                        prevProducts.map(p => 
                          p.id === productId ? { ...p, variants: productData.variants || [] } : p
                        )
                      );
                      
                      // Check if has variants and show modal
                      if (productData.variants && productData.variants.length > 0) {
                        setSelectedProductForVariant({ ...product, variants: productData.variants });
                        setShowVariantModal(true);
                      } else {
                        addProduct(productId);
                      }
                    } else {
                      addProduct(productId);
                    }
                  } catch (error) {
                    console.error('Error fetching product variants:', error);
                    message.warning('Could not load product variants, adding base product');
                    addProduct(productId);
                  }
                } else if (product.variants.length > 0) {
                  // Has variants loaded, show variant selection modal
                  setSelectedProductForVariant(product);
                  setShowVariantModal(true);
                } else {
                  // No variants, add product directly
                  addProduct(productId);
                }
              }}
              value={undefined}
              filterOption={(input, option) => {
                if (!input) return true;
                const searchText = input.toLowerCase();
                const product = products.find(p => p.id === option.value);
                if (!product) return false;
                
                // Search in product name, title, and SKU
                const titleEn = (product.title_en || '').toLowerCase();
                const titleAr = (product.title_ar || '').toLowerCase();
                const name = (product.name || '').toLowerCase();
                const sku = (product.sku || '').toLowerCase();
                
                return titleEn.includes(searchText) || 
                       titleAr.includes(searchText) ||
                       name.includes(searchText) ||
                       sku.includes(searchText);
              }}
            >
              {products.map(product => {
                // Check if product is available at selected branch
                const inventory = branchInventory[product.id] || product;
                const isAvailableAtBranch = selectedBranch ? (
                  inventory.branch_is_available === 1 || inventory.is_available === 1
                ) : true;
                const stockQuantity = selectedBranch ? (
                  inventory.branch_stock_quantity || inventory.stock_quantity || 0
                ) : (product.stock_quantity || 0);
                const stockStatus = selectedBranch ? (
                  inventory.branch_stock_status || inventory.stock_status || 'unknown'
                ) : (product.stock_status || 'unknown');
                
                return (
                  <Option 
                    key={product.id} 
                    value={product.id}
                    label={`${product.title_en || product.name} ${product.sku || ''}`}
                    disabled={selectedBranch && !isAvailableAtBranch}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {product.title_en || product.name}
                          {product.variants && product.variants.length > 0 && (
                            <Tag color="blue" size="small" style={{ marginLeft: 4 }}>
                              {product.variants.length} {product.variants.length === 1 ? 'Variant' : 'Variants'}
                            </Tag>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{product.sku ? `SKU: ${product.sku}` : ''}</span>
                          <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                            {formatPrice(parseFloat(product.base_price || product.sale_price || product.price || 0))}
                          </span>
                        </div>
                      </div>
                      {selectedBranch && (
                        <div style={{ marginLeft: 8 }}>
                          {isAvailableAtBranch ? (
                            <Tag color={stockQuantity > 0 ? 'green' : 'orange'} size="small">
                              {stockStatus === 'in_stock' ? `Stock: ${stockQuantity}` : 
                               stockStatus === 'low_stock' ? `Low: ${stockQuantity}` :
                               stockStatus === 'out_of_stock' ? 'Out of Stock' :
                               'Available'}
                            </Tag>
                          ) : (
                            <Tag color="red" size="small">Not at Branch</Tag>
                          )}
                        </div>
                      )}
                    </div>
                  </Option>
                );
              })}
            </Select>
            
            <div style={{ fontSize: '12px', color: '#666' }}>
              {t ? t('orders.productsHint') : 'Search and select products to add to the order'}
            </div>
            
            <Divider />
            
            <Form.Item 
              label={t ? t('orders.type') : 'Order Type'}
              style={{ marginBottom: 16 }}
            >
              <Select
                value={orderType}
                onChange={(value) => {
                  setOrderType(value);
                  if (value === 'pickup') {
                    setCustomDeliveryFee(0);
                  }
                }}
                style={{ width: '100%' }}
              >
                <Option value="delivery">{t ? t('orders.delivery') : 'Delivery'}</Option>
                <Option value="pickup">{t ? t('orders.pickup') : 'Pickup'}</Option>
              </Select>
            </Form.Item>

            {orderType === 'pickup' && (
              <Form.Item 
                label={t ? t('orders.branch') : 'Branch'}
                style={{ marginBottom: 16 }}
              >
                <Select
                  value={branch}
                  onChange={setBranch}
                  placeholder={t ? t('orders.selectBranch') : 'Select a branch'}
                  style={{ width: '100%' }}
                >
                  {branches.map(branchItem => (
                    <Option key={branchItem.id} value={branchItem.id}>
                      {branchItem.title_en || branchItem.title_ar || `Branch ${branchItem.id}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {orderType === 'delivery' && (
              <Form.Item 
                label={t ? t('orders.deliveryFee') : 'Delivery Fee'}
                style={{ marginBottom: 16 }}
              >
                <InputNumber
                  value={customDeliveryFee}
                  onChange={setCustomDeliveryFee}
                  min={0}
                  step={0.5}
                  formatter={value => `$${value}`}
                  parser={value => value.replace('$', '')}
                  style={{ width: '100%' }}
                  placeholder={t ? t('orders.enterDeliveryFee') : 'Enter delivery fee'}
                />
              </Form.Item>
            )}
            
            <Form.Item 
              label={t ? t('orders.paymentMethod') : 'Payment Method'}
              style={{ marginBottom: 8 }}
            >
              <Select
                value={paymentMethod}
                onChange={setPaymentMethod}
                style={{ width: '100%' }}
              >
                <Option value="cash">
                  💵 {t ? t('orders.cash') : 'Cash'}
                </Option>
                <Option value="card">
                  💳 {t ? t('orders.card') : 'Card (Online Payment)'}
                </Option>
                <Option value="online">
                  🌐 {t ? t('orders.online') : 'Online'}
                </Option>
              </Select>
              {paymentMethod === 'card' && (
                <div style={{ 
                  marginTop: 8, 
                  padding: 8, 
                  backgroundColor: '#f6ffed', 
                  border: '1px solid #b7eb8f',
                  borderRadius: 4,
                  fontSize: '12px',
                  color: '#52c41a'
                }}>
                  💡 {t ? t('orders.card_payment_info') : 'After creating the order, you will be redirected to secure payment gateway (MPGS) to complete the payment.'}
                </div>
              )}
            </Form.Item>

            {/* Promo Code Section */}
            <Form.Item 
              label={t ? t('orders.promo_code') : 'Promo Code'}
              style={{ marginBottom: 8 }}
            >
              {appliedPromo ? (
                <div>
                  <Tag 
                    color="green" 
                    style={{ padding: '4px 12px', fontSize: '14px' }}
                  >
                    {appliedPromo.code} {t ? t('orders.applied') : '(Applied)'} - {appliedPromo.discount.toFixed(2)} JOD {t ? t('orders.promo_discount') : 'discount'}
                  </Tag>
                  <Button 
                    type="link" 
                    danger 
                    size="small"
                    onClick={handleRemovePromoCode}
                  >
                    {t ? t('common.remove') : 'Remove'}
                  </Button>
                </div>
              ) : (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder={t ? t('orders.enter_promo_code') : 'Enter promo code'}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    onPressEnter={handleValidatePromoCode}
                  />
                  <Button 
                    type="primary"
                    loading={promoLoading}
                    onClick={handleValidatePromoCode}
                  >
                    {t ? t('common.apply') : 'Apply'}
                  </Button>
                </Space.Compact>
              )}
              {promoValidation && (
                <div style={{ 
                  marginTop: 8, 
                  color: promoValidation.type === 'success' ? '#52c41a' : '#ff4d4f',
                  fontSize: '12px'
                }}>
                  {promoValidation.message}
                </div>
              )}
            </Form.Item>
          </Card>
        </Col>

        <Col span={12}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t ? t('orders.selectedProducts') : 'Selected Products'}</span>
                <div style={{ fontSize: '14px', textAlign: 'right' }}>
                  <div>{t ? t('orders.subtotal') : 'Subtotal'}: {orderTotals.subtotal.toFixed(2)} JOD</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <span>{t ? t('orders.deliveryFee') : 'Delivery Fee'}:</span>
                    {isDeliveryFeeEditing ? (
                      <Space.Compact>
                        <InputNumber
                          size="small"
                          min={0}
                          step={0.5}
                          precision={2}
                          value={customDeliveryFee}
                          onChange={handleDeliveryFeeChange}
                          style={{ width: 80 }}
                        />
                        <Button 
                          size="small" 
                          type="primary" 
                          onClick={handleDeliveryFeeSave}
                        >
                          ✓
                        </Button>
                        <Button 
                          size="small" 
                          onClick={resetDeliveryFee}
                          title={t ? t('orders.resetDeliveryFee') : 'Reset to calculated fee'}
                        >
                          ↻
                        </Button>
                      </Space.Compact>
                    ) : (
                      <span 
                        onClick={handleDeliveryFeeEdit}
                        style={{ 
                          cursor: 'pointer', 
                          textDecoration: 'underline',
                          color: '#1890ff'
                        }}
                        title={t ? t('orders.clickToEditDeliveryFee') : 'Click to edit delivery fee'}
                      >
                        {orderTotals.delivery_fee.toFixed(2)} JOD
                      </span>
                    )}
                  </div>
                  {appliedPromo && (
                    <div style={{ color: '#52c41a' }}>
                      {t ? t('orders.promo_discount') : 'Promo Discount'}: -{orderTotals.discount_amount.toFixed(2)} JOD
                    </div>
                  )}
                  <div style={{ fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid #d9d9d9', paddingTop: '4px', marginTop: '4px' }}>
                    {t ? t('orders.total') : 'Total'}: {orderTotals.total_amount.toFixed(2)} JOD
                  </div>
                </div>
              </div>
            } 
            size="small"
          >
            <Table
              dataSource={selectedProducts}
              columns={productColumns}
              pagination={false}
              size="small"
              rowKey={(record) => record._uniqueKey || `${record.id}_${record.variant_id || 'base'}`}
              locale={{
                emptyText: t ? t('orders.noProductsSelected') : 'No products selected'
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Dynamic steps based on order type
  const getSteps = () => {
    const allSteps = [
      {
        title: t ? t('orders.customer') : 'Customer',
        icon: <UserOutlined />,
        content: renderCustomerStep()
      },
      {
        title: t ? t('orders.address') : 'Address',
        icon: <EnvironmentOutlined />,
        content: renderAddressStep()
      },
      {
        title: t ? t('orders.products') : 'Products',
        icon: <ShoppingCartOutlined />,
        content: renderProductsStep()
      }
    ];

    // For pickup orders, skip the address step
    if (orderType === 'pickup') {
      return [allSteps[0], allSteps[2]]; // Customer and Products only
    }
    
    return allSteps;
  };

  const steps = getSteps();

  return (
    <Modal
      title={t ? t('orders.createOrder') : 'Create New Order'}
      visible={visible}
      onCancel={handleCancel}
      width={1000}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {currentStep > 0 && (
              <Button onClick={prevStep}>
                {t ? t('common.previous') : 'Previous'}
              </Button>
            )}
          </div>
          <div>
            <Space>
              <Button onClick={handleCancel}>
                {t ? t('common.cancel') : 'Cancel'}
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button type="primary" onClick={nextStep}>
                  {t ? t('common.next') : 'Next'}
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={handleSubmit}
                >
                  {t ? t('orders.createOrder') : 'Create Order'}
                </Button>
              )}
            </Space>
          </div>
        </div>
      }
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map(step => (
          <Step key={step.title} title={step.title} icon={step.icon} />
        ))}
      </Steps>

      <div style={{ minHeight: '400px' }}>
        {steps && steps[currentStep] && steps[currentStep].content ? 
          steps[currentStep].content : 
          <div>Loading...</div>
        }
      </div>

      {/* Variant Selection Modal */}
      <Modal
        title={
          <div>
            <div>{t ? t('orders.selectVariant') : 'Select Product Variant'}</div>
            {selectedProductForVariant && (
              <div style={{ fontSize: '14px', fontWeight: 'normal', color: '#666', marginTop: 4 }}>
                {selectedProductForVariant.title_en || selectedProductForVariant.name}
              </div>
            )}
          </div>
        }
        open={showVariantModal}
        onCancel={() => {
          setShowVariantModal(false);
          setSelectedProductForVariant(null);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setShowVariantModal(false);
              setSelectedProductForVariant(null);
            }}
          >
            {t ? t('common.cancel') : 'Cancel'}
          </Button>,
          <Button
            key="without-variant"
            onClick={() => {
              if (selectedProductForVariant) {
                addProduct(selectedProductForVariant.id);
                setShowVariantModal(false);
                setSelectedProductForVariant(null);
              }
            }}
          >
            {t ? t('orders.addWithoutVariant') : 'Add Without Variant'}
          </Button>
        ]}
        width={600}
      >
        {selectedProductForVariant && selectedProductForVariant.variants && (
          <div>
            <p style={{ marginBottom: 16, color: '#666' }}>
              {t ? t('orders.selectVariantDescription') : 'Choose a variant to add to your order, or add the base product without a variant.'}
            </p>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {selectedProductForVariant.variants.map(variant => {
                const basePrice = parseFloat(
                  selectedProductForVariant.sale_price || 
                  selectedProductForVariant.base_price || 
                  selectedProductForVariant.price || 
                  0
                );
                
                let variantPrice = basePrice;
                let priceLabel = '';
                
                if (variant.pricing_strategy === 'fixed' && variant.price_value) {
                  variantPrice = parseFloat(variant.price_value);
                  priceLabel = `${variantPrice.toFixed(2)} JOD`;
                } else if (variant.pricing_strategy === 'percentage' && variant.price_value) {
                  const adjustment = basePrice * (parseFloat(variant.price_value) / 100);
                  variantPrice = basePrice + adjustment;
                  priceLabel = `${variantPrice.toFixed(2)} JOD (${variant.price_value > 0 ? '+' : ''}${variant.price_value}%)`;
                } else if (variant.pricing_strategy === 'addition' && variant.price_value) {
                  variantPrice = basePrice + parseFloat(variant.price_value);
                  priceLabel = `${variantPrice.toFixed(2)} JOD (+${parseFloat(variant.price_value).toFixed(2)})`;
                } else {
                  priceLabel = `${basePrice.toFixed(2)} JOD`;
                }
                
                return (
                  <Card
                    key={variant.id}
                    size="small"
                    hoverable
                    onClick={() => {
                      addProduct(selectedProductForVariant.id, variant.id);
                      setShowVariantModal(false);
                      setSelectedProductForVariant(null);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong>
                          {variant.title_en || variant.title_ar || variant.variant_name || `Variant ${variant.id}`}
                        </Text>
                        {(variant.variant_value || variant.variant_name) && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                            {variant.variant_name && <span>{variant.variant_name}: </span>}
                            {variant.variant_value}
                          </div>
                        )}
                        {!variant.is_active && (
                          <Tag color="red" size="small" style={{ marginTop: 4 }}>
                            {t ? t('common.inactive') : 'Inactive'}
                          </Tag>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                          {priceLabel}
                        </Text>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </Space>
          </div>
        )}
      </Modal>
    </Modal>
  );
};

export default CreateOrderModal;
