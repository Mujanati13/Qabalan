import React, { useState, useEffect } from 'react';
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
import EnhancedAddressForm from './EnhancedAddressForm';
import customersService from '../../services/customersService';
import productsService from '../../services/productsService';
import ordersService from '../../services/ordersService';
import branchesService from '../../services/branchesService';

const { Option } = Select;
const { Text } = Typography;
const { Step } = Steps;

const CreateOrderModal = ({ visible, onCancel, onSuccess, t }) => {
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
  
  // Product data
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  
  // Order preferences
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customDeliveryFee, setCustomDeliveryFee] = useState(null);
  const [isDeliveryFeeEditing, setIsDeliveryFeeEditing] = useState(false);
  
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

  useEffect(() => {
    if (visible) {
      loadCustomers();
      loadProducts();
      loadCities();
      loadBranches();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerAddresses(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    calculateOrderTotals();
  }, [selectedProducts, selectedAddress, useNewAddress, selectedBranch]);

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
        limit: 100,
        include_inactive: false
      });
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      message.error(t ? t('orders.loadProductsError') : 'Failed to load products');
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

  const addProduct = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = selectedProducts.findIndex(p => p.id === productId);
    if (existingIndex > -1) {
      // Increase quantity if already exists
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setSelectedProducts(updated);
    } else {
      // Add new product
      const price = parseFloat(product.sale_price || product.base_price || product.price || 0);
      setSelectedProducts([...selectedProducts, {
        ...product,
        name: product.title_en || product.name || 'Unknown Product',
        quantity: 1,
        price: price,
        total: price
      }]);
    }
  };

  const updateProductQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }

    const updated = selectedProducts.map(p => 
      p.id === productId 
        ? { ...p, quantity, total: quantity * p.price }
        : p
    );
    setSelectedProducts(updated);
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
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
    switch (step) {
      case 0: // Customer and Branch selection
        if (!selectedBranch) {
          message.error(t ? t('orders.selectBranchRequired') : 'Please select a branch');
          return false;
        }
        if (!selectedCustomer) {
          message.error(t ? t('orders.selectCustomerRequired') : 'Please select a customer');
          return false;
        }
        return true;
      case 1: // Address selection
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
        return true;
      case 2: // Products selection
        if (selectedProducts.length === 0) {
          message.error(t ? t('orders.selectProductsRequired') : 'Please add at least one product');
          return false;
        }
        return true;
      default:
        return true;
    }
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

      let addressData = selectedAddress;
      
      // If using new address and it hasn't been created yet, create it first
      if (useNewAddress && !selectedAddress) {
        const addressValues = await addressForm.validateFields();
        const addressResponse = await customersService.createAddress({
          ...addressValues,
          user_id: selectedCustomer.id
        });
        addressData = addressResponse.data;
      }

      // Create the order
      const orderData = {
        customer_id: selectedCustomer.id,
        delivery_address_id: addressData.id,
        branch_id: selectedBranch?.id || 1, // Use selected branch or default to 1
        customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
        customer_phone: selectedCustomer.phone || '',
        items: selectedProducts.map(p => ({
          product_id: p.id,
          quantity: p.quantity,
          price: p.price
        })),
        total_amount: orderTotals.total_amount,
        subtotal: orderTotals.subtotal,
        delivery_fee: orderTotals.delivery_fee,
        tax_amount: orderTotals.tax_amount,
        discount_amount: orderTotals.discount_amount,
        order_status: 'pending',
        payment_status: 'pending',
        payment_method: paymentMethod,
        order_type: 'delivery'
      };

      await ordersService.create(orderData);
      
      message.success(t ? t('orders.createSuccess') : 'Order created successfully');
      onSuccess?.();
      handleCancel();
    } catch (error) {
      console.error('Error creating order:', error);
      message.error(t ? t('orders.createError') : 'Failed to create order');
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
    setCustomDeliveryFee(null);
    setIsDeliveryFeeEditing(false);
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
          {record.sku && <div style={{ fontSize: '12px', color: '#666' }}>SKU: {record.sku}</div>}
        </div>
      )
    },
    {
      title: t ? t('orders.price') : 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `$${price.toFixed(2)}`
    },
    {
      title: t ? t('orders.quantity') : 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity, record) => (
        <InputNumber
          min={1}
          value={quantity}
          onChange={(value) => updateProductQuantity(record.id, value)}
          style={{ width: '80px' }}
        />
      )
    },
    {
      title: t ? t('orders.total') : 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total) => <Text strong>${total.toFixed(2)}</Text>
    },
    {
      title: t ? t('common.actions') : 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          danger 
          size="small" 
          icon={<DeleteOutlined />}
          onClick={() => removeProduct(record.id)}
        />
      )
    }
  ];

  const renderCustomerStep = () => (
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

      <Form.Item 
        label={t ? t('orders.selectCustomer') : 'Select Customer'}
        required
      >
        <Space.Compact style={{ width: '100%' }}>
          <Select
            showSearch
            placeholder={t ? t('orders.searchCustomer') : 'Search for customer...'}
            optionFilterProp="children"
            value={selectedCustomer?.id}
            onChange={handleCustomerSelect}
            style={{ flex: 1 }}
            filterOption={(input, option) => {
              const children = option.children;
              if (typeof children === 'string') {
                return children.toLowerCase().includes(input.toLowerCase());
              }
              return false;
            }}
          >
            {customers.map(customer => (
              <Option key={customer.id} value={customer.id}>
                {`${customer.first_name} ${customer.last_name}`} - {customer.email}
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
      <Row gutter={16}>
        <Col span={12}>
          <Card title={t ? t('orders.addProducts') : 'Add Products'} size="small">
            <Select
              showSearch
              placeholder={t ? t('orders.searchProducts') : 'Search for products...'}
              style={{ width: '100%', marginBottom: 16 }}
              optionFilterProp="children"
              loading={searchingProducts}
              onChange={addProduct}
              value={undefined}
              filterOption={(input, option) => {
                const children = option.children;
                if (typeof children === 'string') {
                  return children.toLowerCase().includes(input.toLowerCase());
                }
                return false;
              }}
            >
              {products.map(product => (
                <Option key={product.id} value={product.id}>
                  {product.title_en || product.name} - ${parseFloat(product.base_price || product.sale_price || product.price || 0).toFixed(2)}
                </Option>
              ))}
            </Select>
            
            <div style={{ fontSize: '12px', color: '#666' }}>
              {t ? t('orders.productsHint') : 'Search and select products to add to the order'}
            </div>
            
            <Divider />
            
            <Form.Item 
              label={t ? t('orders.paymentMethod') : 'Payment Method'}
              style={{ marginBottom: 0 }}
            >
              <Select
                value={paymentMethod}
                onChange={setPaymentMethod}
                style={{ width: '100%' }}
              >
                <Option value="cash">{t ? t('orders.cash') : 'Cash'}</Option>
                <Option value="card">{t ? t('orders.card') : 'Card'}</Option>
                <Option value="online">{t ? t('orders.online') : 'Online'}</Option>
              </Select>
            </Form.Item>
          </Card>
        </Col>

        <Col span={12}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t ? t('orders.selectedProducts') : 'Selected Products'}</span>
                <div style={{ fontSize: '14px', textAlign: 'right' }}>
                  <div>{t ? t('orders.subtotal') : 'Subtotal'}: ${orderTotals.subtotal.toFixed(2)}</div>
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
                        ${orderTotals.delivery_fee.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid #d9d9d9', paddingTop: '4px', marginTop: '4px' }}>
                    {t ? t('orders.total') : 'Total'}: ${orderTotals.total_amount.toFixed(2)}
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
              rowKey="id"
              locale={{
                emptyText: t ? t('orders.noProductsSelected') : 'No products selected'
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  const steps = [
    {
      title: t ? t('orders.branchAndCustomer') : 'Branch & Customer',
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
        {steps[currentStep].content}
      </div>
    </Modal>
  );
};

export default CreateOrderModal;
