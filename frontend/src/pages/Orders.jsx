import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Select,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  message,
  Descriptions,
  Timeline,
  Input,
  Switch,
  Divider,
  Alert,
  List,
  Avatar,
  Form,
  InputNumber,
  DatePicker,
  Popconfirm,
  Menu,
  Dropdown,
  Spin
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SoundOutlined,
  MutedOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  SearchOutlined ,
  ShoppingCartOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  PrinterOutlined,
  EnvironmentOutlined,
  DownOutlined,
  ExportOutlined,
  UserOutlined ,
  FileTextOutlined,
  MoreOutlined,
  CopyOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { useTableSorting } from '../hooks/useTableSorting.jsx';
import ordersService from '../services/ordersService';
import customersService from '../services/customersService';
import NotificationControls from '../components/notifications/NotificationControls';
import ExportButton from '../components/common/ExportButton';
import { useExportConfig } from '../hooks/useExportConfig';
import { exportOrdersToExcel } from '../utils/comprehensiveExportUtils';
import CreateOrderModal from '../components/common/CreateOrderModal';
import EnhancedAddressForm from '../components/common/EnhancedAddressForm';
import api from '../services/api';
import googleMapsService from '../services/googleMapsService';
import paymentsService from '../services/paymentsService';
import moment from 'moment';
import io from 'socket.io-client';
import { 
  addPersistentNotification, 
  acknowledgePersistentNotification,
  persistentNotificationSystem 
} from '../utils/persistentNotificationSound';
import PersistentNotificationIndicator from '../components/notifications/PersistentNotificationIndicator';
import NotificationTestPanel from '../components/notifications/NotificationTestPanel';
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Enhanced notification sound with better browser compatibility
const playNotificationSound = async () => {
  if (!window.notificationAudioContext) {
    try {
      window.notificationAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.log('AudioContext not supported:', error);
      return playFallbackSound();
    }
  }

  const audioContext = window.notificationAudioContext;
  
  try {
    // Resume context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Create multiple notification beeps for better attention
    const playBeep = (frequency, startTime, duration = 0.15) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    // Play a sequence of beeps
    const currentTime = audioContext.currentTime;
    playBeep(800, currentTime, 0.1);
    playBeep(600, currentTime + 0.15, 0.1);
    playBeep(800, currentTime + 0.35, 0.15);
    
    console.log('Notification sound played successfully');
    return true;
  } catch (error) {
    console.log('AudioContext failed:', error);
    return playFallbackSound();
  }
};

// Fallback sound using HTML5 Audio
const playFallbackSound = () => {
  try {
    // Create multiple audio elements for repeated playback
    if (!window.notificationAudio || window.notificationAudio.ended) {
      window.notificationAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiS0u7MeyIELIHM8tiJOQgZZ7fr45dNEwxPq+Xwtl8bBTmR1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGnt7zv2wfBTiS0u7MeyIELYDU7t2TXBsZcabq65xWEQuBluvs5pJDGQNEmtPzt3EhBTmp3e7QgzQJE2KzhN+XVA8PaUgFoW/;');
      window.notificationAudio.volume = 0.4;
      window.notificationAudio.preload = 'auto';
    }
    
    // Reset and play
    window.notificationAudio.currentTime = 0;
    const playPromise = window.notificationAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        console.log('Audio play failed:', e);
        // Try system notification sound as last resort
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      });
    }
    
    return true;
  } catch (fallbackError) {
    console.log('Fallback audio failed:', fallbackError);
    
    // Final fallback: vibration on mobile
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    return false;
  }
};

// OrderItemsPreview Component
const OrderItemsPreview = ({ items, formatPrice, maxItems = 2 }) => {
  if (!items || items.length === 0) {
    return <Text type="secondary" style={{ fontSize: '11px' }}>No items</Text>;
  }

  const displayItems = items.slice(0, maxItems);
  const remainingCount = items.length - maxItems;

  return (
    <div style={{ fontSize: '11px' }}>
      {displayItems.map((item, index) => {
        // Get product name with fallbacks
        const productName = item?.product_name || 
                           item?.product_title_en || 
                           item?.product_title_ar || 
                           'Unknown Product';
        
        // Get numeric values with fallbacks
        const quantity = Number(item?.quantity || 0);
        const unitPrice = Number(item?.unit_price || item?.price || 0);
        const totalPrice = Number(item?.total_price || (unitPrice * quantity));
        
        // Check for discount
        const calculatedTotal = unitPrice * quantity;
        const hasDiscount = Math.abs(calculatedTotal - totalPrice) > 0.01;
        const discountAmount = calculatedTotal - totalPrice;
        
        // Get variant info
        const variantInfo = item?.variant_name && item?.variant_value ? 
          ` (${item.variant_name}: ${item.variant_value})` : '';
        
        return (
          <div key={index} style={{ marginBottom: '3px', color: '#666' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 'bold' }}>{quantity}x</span>{' '}
                <span title={productName + variantInfo}>
                  {productName.length > 20 ? productName.substring(0, 17) + '...' : productName}
                </span>
                {variantInfo && (
                  <span style={{ color: '#999', fontSize: '10px' }}>
                    {variantInfo.length > 15 ? variantInfo.substring(0, 12) + '...' : variantInfo}
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right', minWidth: '60px' }}>
                {hasDiscount && discountAmount > 0 && (
                  <div style={{ 
                    fontSize: '9px', 
                    color: '#ff7875', 
                    textDecoration: 'line-through' 
                  }}>
                    {formatPrice(calculatedTotal)}
                  </div>
                )}
                <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {formatPrice(totalPrice)}
                </div>
                {hasDiscount && discountAmount > 0 && (
                  <div style={{ fontSize: '9px', color: '#fa8c16' }}>
                    -{formatPrice(discountAmount)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div style={{ color: '#999', fontSize: '10px', marginTop: '2px', textAlign: 'center' }}>
          +{remainingCount} more item{remainingCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

// OrderItemCard Component for detailed view
const OrderItemCard = ({ item, formatPrice }) => {
  // Get product name from various possible fields
  const productName = item?.product_name || 
                     item?.product_title_en || 
                     item?.product_title_ar || 
                     'Unknown Product';
  
  // Get unit price and calculate values
  const unitPrice = Number(item?.unit_price || item?.price || 0);
  const quantity = Number(item?.quantity || 0);
  const totalPrice = Number(item?.total_price || (unitPrice * quantity));
  
  // Get product image with fallback
  const productImage = item?.product_image || item?.main_image || '/api/placeholder/80/80';
  
  // Get variant information
  const variantName = item?.variant_name;
  const variantValue = item?.variant_value;
  const productSku = item?.product_sku || item?.sku;
  
  // Calculate discount if there's a difference between calculated and actual total
  const calculatedTotal = unitPrice * quantity;
  const discount = calculatedTotal - totalPrice;
  const hasDiscount = discount > 0.01; // More than 1 cent difference
  
  // Get discount information
  const itemDiscount = Number(item?.discount_amount || item?.discount || 0);
  const discountPercent = item?.discount_percent || (unitPrice > 0 ? Math.round((itemDiscount / unitPrice) * 100) : 0);
  
  return (
    <Card 
      size="small" 
      style={{ 
        marginBottom: '12px',
        borderLeft: '3px solid #1890ff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <Row gutter={16} align="middle">
        {/* Product Image */}
        <Col span={4}>
          <div style={{ textAlign: 'center' }}>
            <img 
              src={productImage} 
              alt={productName}
              style={{ 
                width: '60px', 
                height: '60px', 
                objectFit: 'cover', 
                borderRadius: '8px',
                border: '1px solid #f0f0f0'
              }}
              onError={(e) => {
                e.target.src = '/api/placeholder/60/60';
              }}
            />
          </div>
        </Col>
        
        {/* Product Details */}
        <Col span={12}>
          <div>
            <Text strong style={{ fontSize: '15px', color: '#262626' }}>
              {productName}
            </Text>
            
            {/* Product SKU */}
            {productSku && (
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>
                <Text type="secondary">SKU: {productSku}</Text>
              </div>
            )}
            
            {/* Variant Information */}
            {(variantName || variantValue) && (
              <div style={{ fontSize: '12px', color: '#595959', marginTop: '4px' }}>
                <Tag size="small" color="blue">
                  {variantName && variantValue ? `${variantName}: ${variantValue}` : 
                   variantName || variantValue}
                </Tag>
              </div>
            )}
            
            {/* Price Information */}
            <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
              <Space split={<span style={{ color: '#d9d9d9' }}>•</span>}>
                <span>Unit Price: {formatPrice(unitPrice)}</span>
                <span>Qty: <strong>{quantity}</strong></span>
              </Space>
            </div>
            
            {/* Discount Information */}
            {(hasDiscount || itemDiscount > 0) && (
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                <Tag color="orange" size="small">
                  {discountPercent > 0 ? `${discountPercent}% OFF` : 'DISCOUNT'}
                  {itemDiscount > 0 && ` (-${formatPrice(itemDiscount)})`}
                </Tag>
              </div>
            )}
          </div>
        </Col>
        
        {/* Quantity and Total */}
        <Col span={8} style={{ textAlign: 'right' }}>
          <div>
            {/* Original Price (if discounted) */}
            {hasDiscount && (
              <div style={{ fontSize: '12px', color: '#8c8c8c', textDecoration: 'line-through' }}>
                {formatPrice(calculatedTotal)}
              </div>
            )}
            
            {/* Total Price */}
            <div>
              <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                {formatPrice(totalPrice)}
              </Text>
            </div>
            
            {/* Savings */}
            {hasDiscount && (
              <div style={{ fontSize: '11px', color: '#ff7875' }}>
                Save {formatPrice(discount)}
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );
};

const Orders = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { 
    pendingOrdersCount, 
    updatePendingCount, 
    refreshNotifications,
    triggerNewSupportTicketNotification,
    triggerSupportReplyNotification
  } = useNotifications();
  const { getOrdersExportConfig } = useExportConfig();
  
  // Socket connection ref
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('orderSoundEnabled') !== 'false'
  );
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusUpdateVisible, setStatusUpdateVisible] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [createOrderVisible, setCreateOrderVisible] = useState(false);
  const [editOrderVisible, setEditOrderVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [editOrderItems, setEditOrderItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [orderForm] = Form.useForm();
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [shippingZones, setShippingZones] = useState([]);
  const [shippingCalculation, setShippingCalculation] = useState(null);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  
  // Customer selection for order creation
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState(null);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  
  // Address editing states
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm] = Form.useForm();
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [streets, setStreets] = useState([]);
  
  const [filters, setFilters] = useState({
    status: 'all',
    order_type: 'all',
    payment_method: 'all',
    date_range: 'today',
    custom_date_range: null,
    search: ''
  });
  const [orderStats, setOrderStats] = useState({});
  const [orderCounts, setOrderCounts] = useState({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Bulk selection states
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionVisible, setBulkActionVisible] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [paymentLoadingId, setPaymentLoadingId] = useState(null); // Track loading for pay button

  // Payment update states
  const [paymentUpdateVisible, setPaymentUpdateVisible] = useState(false);
  const [paymentUpdateLoading, setPaymentUpdateLoading] = useState(false);
  const [paymentLinkVisible, setPaymentLinkVisible] = useState(false);
  const [generatedPaymentLink, setGeneratedPaymentLink] = useState('');
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);

  // Initiate MPGS Hosted Checkout for an order
  const initiateCardPayment = async (order) => {
    if (!order || paymentLoadingId) return;
    if (order.payment_status === 'paid') {
      message.info(t('orders.already_paid') || 'Order already paid');
      return;
    }
    setPaymentLoadingId(order.id);
    try {
      // Use the new spec-compliant endpoint
      const res = await paymentsService.createMPGSCheckoutSession(
        order.id, 
        order.total_amount, 
        'JOD'
      );
      
      if (!res?.success) {
        message.error(res?.message || t('orders.payment_session_failed') || 'Failed to create payment session');
        return;
      }
      
  const { sessionId, checkoutUrl, orderId, redirectUrl, redirectUrlAbsolute, payPageUrl, scriptCheckoutUrl } = res;
      if (!sessionId) {
        message.error('Missing session information');
        return;
      }
  // Prefer testFormUrl for debugging, then directPayUrl for immediate payment page redirection
  let urlToOpen = res.testFormUrl || res.directPayUrl || res.scriptCheckoutUrl || res.redirectUrlAbsolute || res.redirectUrl || res.checkoutUrl;
      if (!urlToOpen) {
        message.error('Missing checkout URL');
        return;
      }
  window.open(urlToOpen, '_blank', 'noopener,noreferrer,width=600,height=750');
  console.log('MPGS payment URLs (opened):', { checkoutUrl, redirectUrl, redirectUrlAbsolute, payPageUrl, scriptCheckoutUrl });
      message.success(t('orders.payment_redirecting') || 'Redirecting to secure payment page...');
      console.log('Opened MPGS hosted page for order', order.id, 'session', sessionId);
    } catch (err) {
      console.error('Card payment init error:', err);
      message.error(t('orders.payment_session_error') || 'Could not start card payment');
    } finally {
      setPaymentLoadingId(null);
    }
  };

  // Apply client-side filtering to orders
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    
    return orders.filter(order => {
      // Payment method filter
      if (filters.payment_method && filters.payment_method !== 'all') {
        if (order.payment_method !== filters.payment_method) return false;
      }
      
      // Status filter
      if (filters.status && filters.status !== 'all') {
        if (order.status !== filters.status) return false;
      }
      
      // Order type filter
      if (filters.order_type && filters.order_type !== 'all') {
        if (order.order_type !== filters.order_type) return false;
      }
      
      // Date range filter
      if (filters.date_range && filters.date_range !== 'all') {
        const orderDate = new Date(order.created_at);
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        switch (filters.date_range) {
          case 'today':
            if (orderDate < startOfToday) return false;
            break;
          case 'yesterday':
            const yesterday = new Date(startOfToday);
            yesterday.setDate(yesterday.getDate() - 1);
            if (orderDate < yesterday || orderDate >= startOfToday) return false;
            break;
          case 'week':
            const weekAgo = new Date(startOfToday);
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (orderDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(startOfToday);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            if (orderDate < monthAgo) return false;
            break;
          case 'custom':
            if (filters.custom_date_range) {
              const [startDate, endDate] = filters.custom_date_range;
              if (startDate && orderDate < new Date(startDate)) return false;
              if (endDate && orderDate > new Date(endDate)) return false;
            }
            break;
        }
      }
      
      // Search filter
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase();
        const searchableFields = [
          order.id?.toString(),
          order.customer_name,
          order.customer_phone,
          order.customer_email,
          order.notes,
          order.status,
          order.payment_method,
          order.order_type
        ];
        
        const hasMatch = searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchLower)
        );
        
        if (!hasMatch) return false;
      }
      
      return true;
    });
  }, [orders, filters]);

  // Initialize table sorting with default sorting by created_at (newest first)
  const {
    sortedData: sortedOrders,
    sortConfig,
    getColumnSortProps,
    clearSorting
  } = useTableSorting(filteredOrders, [
    { key: 'created_at', direction: 'desc', comparator: (a, b, direction) => {
      const aVal = new Date(a).getTime() || 0;
      const bVal = new Date(b).getTime() || 0;
      const result = aVal - bVal;
      return direction === 'asc' ? result : -result;
    }}
  ]);

  // Initialize persistent notification system
  useEffect(() => {
    console.log('🔔 Initializing persistent notification system...');
    
    // Restore any notifications from previous session
    persistentNotificationSystem.restoreNotifications();
    
    // Set sound preference
    const savedSoundEnabled = localStorage.getItem('orderSoundEnabled');
    const enabled = savedSoundEnabled !== 'false';
    persistentNotificationSystem.setSoundEnabled(enabled);
    
    // Add click listener to initialize audio on first user interaction
    const handleFirstInteraction = async () => {
      console.log('👆 First user interaction detected, initializing audio...');
      await persistentNotificationSystem.initializeUserInteraction();
      
      // Remove the listener after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    
    return () => {
      // Clean up when component unmounts
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      persistentNotificationSystem.destroy();
    };
  }, []);

  // Socket connection setup
  useEffect(() => {
    console.log('🚀 Orders component mounted, initializing Socket.io...');
    
    const initializeSocket = () => {
      // Try both token keys used in the app
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      console.log('🔑 Token check:');
      console.log('  admin_token:', localStorage.getItem('admin_token') ? 'Found' : 'Not found');
      console.log('  token:', localStorage.getItem('token') ? 'Found' : 'Not found');
      console.log('  Using token:', token ? 'Token found' : 'No token found');
      
      if (!token) {
        console.warn('⚠️ No authentication token found, skipping Socket.io connection');
        console.warn('Please make sure you are logged into the admin dashboard');
        return;
      }

      // Get Socket.IO URL from environment variable with intelligent fallback
      let socketUrl = import.meta.env.VITE_SOCKET_URL;
      
      // If no environment variable is set, determine based on current location
      if (!socketUrl) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          socketUrl = 'http://localhost:3015';
        } else {
          // Use current host for production
          socketUrl = `${window.location.protocol}//${window.location.hostname}`;
        }
      }
      
      console.log('🌐 Environment variables:');
      console.log('  VITE_API_URL:', import.meta.env.VITE_API_URL);
      console.log('  VITE_SOCKET_URL:', import.meta.env.VITE_SOCKET_URL);
      console.log('  Current host:', window.location.host);
      console.log('  Current protocol:', window.location.protocol);
      console.log('  Using socketUrl:', socketUrl);
      console.log('🔌 Attempting to connect to Socket.io server at:', socketUrl);
      
      // Test basic HTTP connectivity first
      console.log('🔍 Testing basic HTTP connectivity...');
      fetch(`${socketUrl}/api/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      .then(response => {
        console.log('✅ HTTP connectivity test result:', response.status, response.statusText);
      })
      .catch(httpError => {
        console.error('❌ HTTP connectivity test failed:', httpError.message);
        console.error('  This indicates the backend server may not be running on:', socketUrl);
      });
      
      // Enhanced debugging
      console.log('🔍 Socket.IO Debug Information:');
      console.log('  - Token exists:', !!token);
      console.log('  - Token preview:', token ? token.substring(0, 20) + '...' : 'None');
      console.log('  - Connection config:', {
        auth: { token: token ? 'Present' : 'Missing' },
        transports: ['polling', 'websocket'], // Try polling first, then WebSocket
        timeout: 30000, // Increased timeout
        forceNew: true,
        upgrade: true,
        rememberUpgrade: false
      });
      
      try {
        socketRef.current = io(socketUrl, {
          auth: { token },
          transports: ['polling', 'websocket'], // Try polling first
          timeout: 30000,
          timeout: 20000,
          forceNew: true,
          upgrade: true,
          rememberUpgrade: false,
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          maxReconnectionAttempts: 5
        });

        // Enhanced connection success logging
        socketRef.current.on('connect', () => {
          console.log('✅ Socket.io connected successfully');
          console.log('  - Socket ID:', socketRef.current.id);
          console.log('  - Transport used:', socketRef.current.io.engine.transport.name);
          console.log('  - Connected to:', socketRef.current.io.uri);
          console.log('  - Protocol version:', socketRef.current.protocol);
          setIsConnected(true);
        });

        // Enhanced error logging
        socketRef.current.on('connect_error', (error) => {
          console.error('❌ Socket.io connection error:', error);
          console.error('  - Error type:', error.type);
          console.error('  - Error description:', error.description);
          console.error('  - Error context:', error.context);
          console.error('  - Error transport:', error.transport);
          console.error('  - Error message:', error.message);
          console.error('  - Full error object:', JSON.stringify(error, null, 2));
          
          // Network debugging
          console.log('🌐 Network Debug:');
          console.log('  - Current URL:', window.location.href);
          console.log('  - Origin:', window.location.origin);
          console.log('  - Is HTTPS:', window.location.protocol === 'https:');
          console.log('  - Target URL:', socketUrl);
          
          // Specific error analysis
          if (error.type === 'TransportError') {
            console.log('🔍 Transport Error Analysis:');
            console.log('  - This usually means the WebSocket connection failed');
            console.log('  - Possible causes:');
            console.log('    1. Backend server not running on:', socketUrl);
            console.log('    2. Firewall blocking WebSocket connections');
            console.log('    3. SSL/TLS certificate issues');
            console.log('    4. CORS policy blocking the connection');
            console.log('  - Socket.IO should automatically try HTTP polling next...');
          }
          
          setIsConnected(false);
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('🔌 Socket.io disconnected:', reason);
          setIsConnected(false);
        });

        socketRef.current.on('error', (error) => {
          console.error('🚨 Socket.io error:', error);
        });
      } catch (error) {
        console.error('💥 Failed to initialize Socket.io:', error);
      }

      // Listen for connection confirmation from server
      socketRef.current.on('connection_confirmed', (data) => {
        console.log('🎉 Connection confirmed from server:', data);
      });

      // Real-time order events
      socketRef.current.on('newOrderCreated', (orderData) => {
        console.log('🆕 New order received via Socket.io:', orderData);
        
        // Add persistent notification that will keep playing sound until acknowledged
        const notificationId = `order_${orderData.orderId}_${Date.now()}`;
        addPersistentNotification(notificationId, {
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone || '',
          customerEmail: orderData.customerEmail || '',
          orderTotal: orderData.orderTotal,
          orderType: orderData.orderType,
          paymentMethod: orderData.paymentMethod || 'cash',
          paymentStatus: orderData.paymentStatus || 'pending',
          createdAt: orderData.createdAt,
          itemsCount: orderData.itemsCount || 1,
          items: orderData.items || []
        });
        
        // Show visual notification
        message.success({
          content: `🆕 New order received: #${orderData.orderId} from ${orderData.customerName}`,
          duration: 6,
          style: { marginTop: '10vh' }
        });
        
        // Add the new order to the beginning of the list if on pending filter or all
        if (filters.status === 'all' || filters.status === 'pending') {
          setOrders(prevOrders => {
            // Create a new order object with the received data
            const newOrder = {
              id: orderData.orderId,
              order_number: orderData.orderNumber,
              customer_name: orderData.customerName,
              customer_phone: orderData.customerPhone || '',
              customer_email: orderData.customerEmail || '',
              order_status: 'pending',
              order_type: orderData.orderType,
              payment_method: orderData.paymentMethod || 'cash',
              payment_status: orderData.paymentStatus || 'pending',
              total_amount: orderData.orderTotal,
              created_at: orderData.createdAt,
              items_count: orderData.itemsCount || 1,
              items: orderData.items || []
            };
            
            // Add to the beginning of the list
            return [newOrder, ...prevOrders];
          });
        }
        
        // Update counts and notifications
        updatePendingCount();
        fetchOrderStats();
        fetchOrderCounts(); // Add this to update the counts display
      });

      socketRef.current.on('orderStatusUpdated', (orderData) => {
        console.log('Order status updated:', orderData);
        
        // Play notification sound for important status changes
        if (soundEnabled && ['delivered', 'cancelled'].includes(orderData.newStatus)) {
          playNotificationSound();
        }
        
        // Show notification for status changes
        message.info({
          content: `Order #${orderData.orderId} status changed from ${orderData.previousStatus} to ${orderData.newStatus}`,
          duration: 4
        });
        
        // Update order in the list
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderData.orderId ? { 
              ...order, 
              order_status: orderData.newStatus,
              updated_at: orderData.updatedAt 
            } : order
          )
        );
        
        // Update selected order if it's the same one
        if (selectedOrder && selectedOrder.id === orderData.orderId) {
          setSelectedOrder(prev => ({ 
            ...prev, 
            order_status: orderData.newStatus,
            updated_at: orderData.updatedAt 
          }));
        }
        
        // Update counts
        updatePendingCount();
        fetchOrderStats();
        fetchOrderCounts(); // Add this to update the counts display
      });

      socketRef.current.on('orderCancelled', (data) => {
        console.log('Order cancelled:', data);
        
        // Play notification sound
        if (soundEnabled) {
          playNotificationSound();
        }
        
        // Show notification
        message.warning({
          content: `Order #${data.orderId} has been cancelled by ${data.cancelledBy}`,
          duration: 5
        });
        
        // Update order in the list
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === data.orderId ? { 
              ...order, 
              order_status: 'cancelled',
              cancelled_at: data.cancelledAt,
              cancellation_reason: data.cancellationReason
            } : order
          )
        );
        
        // Update selected order if it's the same one
        if (selectedOrder && selectedOrder.id === data.orderId) {
          setSelectedOrder(prev => ({ 
            ...prev, 
            order_status: 'cancelled',
            cancelled_at: data.cancelledAt,
            cancellation_reason: data.cancellationReason
          }));
        }
        
        updatePendingCount();
        fetchOrderStats();
      });

      socketRef.current.on('orderCountsUpdated', (data) => {
        console.log('Order counts updated:', data);
        
        // Update the pending orders count in the notification context
        updatePendingCount(data.pendingOrders);
        
        // Update local order counts state
        setOrderCounts(prevCounts => ({
          ...prevCounts,
          pending: data.pendingOrders
        }));
      });

      socketRef.current.on('notification', (notification) => {
        console.log('Real-time notification:', notification);
        
        if (soundEnabled) {
          playNotificationSound();
        }
        
        // Show notification based on type
        const messageConfig = {
          content: notification.message,
          duration: 5
        };
        
        switch (notification.type) {
          case 'success':
            message.success(messageConfig);
            break;
          case 'error':
            message.error(messageConfig);
            break;
          case 'warning':
            message.warning(messageConfig);
            break;
          default:
            message.info(messageConfig);
        }
        
        refreshNotifications();
      });

      // Support ticket socket events
      socketRef.current.on('newSupportTicket', (ticketData) => {
        console.log('🎟️ New support ticket received via socket:', ticketData);
        
        // Trigger notification through context
        triggerNewSupportTicketNotification(ticketData);
      });

      socketRef.current.on('newSupportReply', (replyData) => {
        console.log('💬 New support reply received via socket:', replyData);
        
        // Trigger notification through context
        triggerSupportReplyNotification(replyData);
      });
    };

    initializeSocket();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up Socket.io connection...');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once

  // Test connection function for debugging
  const testSocketConnection = () => {
    console.log('🔍 Testing Socket.io connection...');
    console.log('Connection status:', isConnected);
    console.log('Socket object:', socketRef.current);
    
    if (socketRef.current) {
      console.log('Socket connected:', socketRef.current.connected);
      console.log('Socket ID:', socketRef.current.id);
    } else {
      console.log('No socket connection found');
    }
  };

  // Toggle sound notifications
  const toggleSound = () => {
    const newSoundEnabled = !soundEnabled;
    setSoundEnabled(newSoundEnabled);
    localStorage.setItem('orderSoundEnabled', newSoundEnabled.toString());
    
    message.info({
      content: newSoundEnabled ? 'Sound notifications enabled' : 'Sound notifications disabled',
      duration: 2
    });
  };

  useEffect(() => {
    fetchOrders();
    fetchOrderStats();
    fetchOrderCounts();
    fetchBranches();
    fetchShippingZones();
    fetchProducts();
    fetchCities(); // Fetch cities for address editing
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Apply filters properly
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.order_type && filters.order_type !== 'all') {
        params.order_type = filters.order_type;
      }
      if (filters.payment_method && filters.payment_method !== 'all') {
        params.payment_method = filters.payment_method;
      }
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }
      
      // Handle date range - convert predefined ranges to start_date/end_date
      if (filters.date_range && filters.date_range !== 'all') {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (filters.date_range === 'custom' && filters.custom_date_range) {
          const [startDate, endDate] = filters.custom_date_range;
          if (startDate && endDate) {
            // Handle both moment.js objects and plain date objects
            const startDateStr = startDate.format ? startDate.format('YYYY-MM-DD') : startDate;
            const endDateStr = endDate.format ? endDate.format('YYYY-MM-DD') : endDate;
            params.start_date = startDateStr;
            params.end_date = endDateStr;
          }
        } else {
          // Convert predefined date ranges to specific dates
          switch (filters.date_range) {
            case 'today':
              params.start_date = todayStr;
              params.end_date = todayStr;
              break;
            case 'yesterday':
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              params.start_date = yesterdayStr;
              params.end_date = yesterdayStr;
              break;
            case 'week':
              const weekAgo = new Date(today);
              weekAgo.setDate(weekAgo.getDate() - 7);
              params.start_date = weekAgo.toISOString().split('T')[0];
              params.end_date = todayStr;
              break;
            case 'month':
              const monthAgo = new Date(today);
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              params.start_date = monthAgo.toISOString().split('T')[0];
              params.end_date = todayStr;
              break;
            default:
              // For any other predefined range, don't add date filters
              break;
          }
        }
      }
      
      // Set high limit to show more orders, and handle pagination
      params.limit = 1000; // Significantly increased limit to show more orders
      params.page = 1; // Always start from page 1 to get the most recent orders
      
      console.log('Fetching orders with params:', params);
      const response = await ordersService.getOrders(params);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Fetch orders error:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>{t('common.validationFailed')}:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || t('errors.fetch_failed'));
        }
      } else {
        message.error(error.message || t('errors.fetch_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderStats = async () => {
    try {
      setStatsLoading(true);
      
      // Calculate stats from the filtered orders data instead of calling backend
      // This ensures the stats reflect the current filter state
      if (filteredOrders && filteredOrders.length >= 0) {
        const stats = {
          total_orders: filteredOrders.length,
          total_revenue: filteredOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0),
          average_order_value: filteredOrders.length > 0 ? 
            filteredOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) / filteredOrders.length : 0,
          status_stats: []
        };
        
        // Calculate status statistics
        const statusCounts = {};
        filteredOrders.forEach(order => {
          const status = order.order_status || 'unknown';
          if (!statusCounts[status]) {
            statusCounts[status] = { count: 0, total_amount: 0 };
          }
          statusCounts[status].count++;
          statusCounts[status].total_amount += parseFloat(order.total_amount) || 0;
        });
        
        // Convert to array format
        stats.status_stats = Object.entries(statusCounts).map(([status, data]) => ({
          order_status: status,
          count: data.count,
          total_amount: data.total_amount
        }));
        
        // Calculate payment method statistics
        const paymentCounts = {};
        filteredOrders.forEach(order => {
          const method = order.payment_method || 'unknown';
          if (!paymentCounts[method]) {
            paymentCounts[method] = { count: 0, total_amount: 0 };
          }
          paymentCounts[method].count++;
          paymentCounts[method].total_amount += parseFloat(order.total_amount) || 0;
        });
        
        stats.payment_stats = Object.entries(paymentCounts).map(([method, data]) => ({
          payment_method: method,
          count: data.count,
          total_amount: data.total_amount
        }));
        
        console.log('✅ Calculated stats from filtered orders:', stats);
        setOrderStats(stats);
      } else {
        // Fallback to empty stats if no filtered orders
        setOrderStats({
          total_orders: 0,
          total_revenue: 0,
          average_order_value: 0,
          status_stats: [],
          payment_stats: []
        });
      }
    } catch (error) {
      console.error('Failed to fetch order stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchOrderCounts = async () => {
    try {
      console.log('🔢 Calculating order counts from filtered orders...');
      
      // Calculate counts from the filtered orders data
      const counts = {};
      
      if (filteredOrders && filteredOrders.length >= 0) {
        filteredOrders.forEach(order => {
          const status = order.order_status || 'unknown';
          counts[status] = (counts[status] || 0) + 1;
        });
      }
      
      console.log('📊 Calculated order counts:', counts);
      setOrderCounts(counts);
    } catch (error) {
      console.error('Failed to calculate order counts:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      // You'll need to add this endpoint or import from another service
      const response = await api.get('/branches');
      const data = response.data;
      setBranches(data.data || []);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      // Fallback to mock data
      setBranches([
        { id: 635, title_en: 'Amman Main Branch', title_ar: 'فرع عمان الرئيسي', latitude: 31.9454, longitude: 35.9284 },
        { id: 636, title_en: 'West Amman Branch', title_ar: 'فرع غرب عمان', latitude: 31.9394, longitude: 35.8714 }
      ]);
    }
  };

  const fetchShippingZones = async () => {
    try {
  const response = await api.get('/shipping/zones');
  setShippingZones((response.data && response.data.data && response.data.data.zones) || []);
    } catch (error) {
      console.error('Failed to fetch shipping zones:', error);
      setShippingZones([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      const products = response.data.data || [];
      console.log('Raw API response:', response.data);
      console.log('Products array from API:', products);
      
      if (products.length > 0) {
        console.log('First product structure:', products[0]);
        console.log('All products with pricing info:', products.map(p => ({
          id: p.id,
          name: p.name || p.title_en || p.title_ar,
          base_price: p.base_price,
          sale_price: p.sale_price,
          final_price: p.final_price,
          // Old field names for comparison
          price: p.price,
          unit_price: p.unit_price,
          selling_price: p.selling_price,
          sale_price_old: p.sale_price
        })));
        
        console.log('Using API products:', products);
        setAvailableProducts(products);
        setProducts(products);
        return products;
      } else {
        console.warn('No products returned from API, using fallback mock data');
        // Only use mock data if API returns empty array
        const mockProducts = [
          { id: 1, title_en: 'Chicken Burger', title_ar: 'برجر دجاج', price: 12.99, sku: 'CB001' },
          { id: 2, title_en: 'Beef Burger', title_ar: 'برجر لحم', price: 15.99, sku: 'BB001' },
          { id: 3, title_en: 'Fries', title_ar: 'بطاطا مقلية', price: 5.99, sku: 'FR001' },
          { id: 4, title_en: 'Soft Drink', title_ar: 'مشروب غازي', price: 2.99, sku: 'SD001' }
        ];
        console.log('Using fallback mock products:', mockProducts);
        setAvailableProducts(mockProducts);
        setProducts(mockProducts);
        return mockProducts;
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Fallback to mock data only on API error
      const mockProducts = [
        { id: 1, title_en: 'Chicken Burger', title_ar: 'برجر دجاج', price: 12.99, sku: 'CB001' },
        { id: 2, title_en: 'Beef Burger', title_ar: 'برجر لحم', price: 15.99, sku: 'BB001' },
        { id: 3, title_en: 'Fries', title_ar: 'بطاطا مقلية', price: 5.99, sku: 'FR001' },
        { id: 4, title_en: 'Soft Drink', title_ar: 'مشروب غازي', price: 2.99, sku: 'SD001' }
      ];
      console.log('Using mock products due to API error:', mockProducts);
      setAvailableProducts(mockProducts);
      setProducts(mockProducts);
      return mockProducts;
    }
  };

  // Fetch customers for selection in order creation
  const fetchCustomers = async (searchTerm = '') => {
    try {
      setCustomerSearchLoading(true);
      const response = await customersService.getCustomers({ 
        search: searchTerm,
        limit: 20 
      });
      
      if (response.success) {
        setCustomers(response.data || []);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  // Handle customer selection in order form
  const handleCustomerSelect = async (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomerForOrder(customer);
      
      // Auto-fill customer details in form
      orderForm.setFieldsValue({
        customer_name: `${customer.first_name} ${customer.last_name}`,
        customer_phone: customer.phone,
        customer_email: customer.email || ''
      });
      
      // Fetch customer's addresses
      await fetchCustomerAddresses(customer.phone, customer.id);
    }
  };

  // Fetch customer addresses by phone number or customer ID
  const fetchCustomerAddresses = async (phoneNumber, customerId = null) => {
    try {
      console.log('Fetching addresses for customer:', { phoneNumber, customerId });
      
      let response;
      if (customerId) {
        response = await api.get(`/addresses?user_id=${customerId}`);
      } else if (phoneNumber) {
        // Search user by phone first, then get addresses
        const userResponse = await api.get(`/users?phone=${phoneNumber}&limit=1`);
        if (userResponse.data.success && userResponse.data.data.length > 0) {
          const userId = userResponse.data.data[0].id;
          response = await api.get(`/addresses?user_id=${userId}`);
        } else {
          console.log('No user found with phone number:', phoneNumber);
          setCustomerAddresses([]);
          return [];
        }
      } else {
        setCustomerAddresses([]);
        return [];
      }

      if (response && response.data.success) {
        const addresses = response.data.data || [];
        console.log('Customer addresses loaded:', addresses);
        setCustomerAddresses(addresses);
        return addresses;
      } else {
        console.log('No addresses found for customer');
        setCustomerAddresses([]);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch customer addresses:', error);
      setCustomerAddresses([]);
      return [];
    }
  };

  // Handle customer phone change to load addresses
  const handleCustomerPhoneChange = async (phoneNumber) => {
    if (phoneNumber && phoneNumber.length >= 8) { // Minimum phone length
      const addresses = await fetchCustomerAddresses(phoneNumber);
      
      // Check address quality and provide feedback
      if (addresses && addresses.length > 0) {
        const addressesWithCoords = addresses.filter(addr => addr.latitude && addr.longitude);
        const addressesWithoutCoords = addresses.filter(addr => !addr.latitude || !addr.longitude);
        
        if (addressesWithoutCoords.length > 0) {
          console.log('Found addresses without coordinates:', addressesWithoutCoords);
          message.info({
            content: (
              <div>
                <div><strong>📍 Address Quality Check</strong></div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Found {addresses.length} address{addresses.length !== 1 ? 'es' : ''} 
                  ({addressesWithCoords.length} with GPS, {addressesWithoutCoords.length} without GPS)
                  {addressesWithoutCoords.length > 0 && (
                    <div style={{ marginTop: '4px', color: '#d46b08' }}>
                      ⚠️ Addresses without GPS will use default zone pricing
                    </div>
                  )}
                </div>
              </div>
            ),
            duration: 6
          });
        }
      }
    } else {
      setCustomerAddresses([]);
      setShippingCalculation(null);
    }
  };

  // Fallback shipping calculation using zone-based pricing
  const calculateFallbackShipping = async (branchId, orderAmount = 0) => {
    try {
      // Fetch branch-specific zones (with overrides if any)
      const response = await api.get(`/shipping/branches/${branchId}/zones`);
      if (response.data && response.data.success) {
        const zones = (response.data.data && response.data.data.zones) || [];
        // Use the default zone or first available zone
        const defaultZone = zones.find(z => z.is_default) || zones[0];
        if (defaultZone) {
          const baseCost = defaultZone.base_price || 10; // Default 10 AED
          const freeShippingThreshold = defaultZone.free_shipping_threshold || 100;
          
          return {
            total_shipping_cost: orderAmount >= freeShippingThreshold ? 0 : baseCost,
            free_shipping_applied: orderAmount >= freeShippingThreshold,
            zone_name: defaultZone.name_en || 'Standard Zone',
            zone_name_en: defaultZone.name_en || 'Standard Zone',
            distance_km: 0,
            distance: 0,
            base_cost: baseCost,
            calculation_method: 'zone-fallback',
            free_shipping_threshold: freeShippingThreshold
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Fallback shipping calculation failed:', error);
      return null;
    }
  };

  // Clean Google Maps + fallback shipping calculation
  const calculateShippingCost = async (deliveryAddressId, branchId, orderAmount = 0) => {
    try {
      if (!deliveryAddressId || !branchId) return null;

      // 1. Fetch address (must exist & have or produce coordinates)
      let customerLocation = null;
      let addressData = null;
      if (!isNaN(deliveryAddressId)) {
        const addressResp = await api.get(`/addresses/${deliveryAddressId}`);
        if (!addressResp.data?.success) throw new Error('Address not found');
        addressData = addressResp.data.data;
        if (addressData.latitude && addressData.longitude) {
          customerLocation = { lat: parseFloat(addressData.latitude), lng: parseFloat(addressData.longitude) };
        } else if (addressData.address_line) {
          const fullAddress = `${addressData.address_line}, ${addressData.area || ''}, ${addressData.city || ''}, Jordan`;
          const geo = await googleMapsService.geocodeAddress(fullAddress);
          if (geo.success) {
            customerLocation = geo.coordinates;
            // Save back (best effort)
            api.put(`/addresses/${deliveryAddressId}`, { latitude: customerLocation.lat, longitude: customerLocation.lng }).catch(() => {});
          } else throw new Error('Unable to geocode address');
        } else throw new Error('Incomplete address');
      } else {
        return null; // text/manual address not supported for automatic calc
      }

      // 2. Fetch branch
      let branchLocation = null;
      try {
        const branchResp = await api.get(`/branches/${branchId}`);
        const b = branchResp.data?.data;
        if (b?.latitude && b?.longitude) branchLocation = { lat: parseFloat(b.latitude), lng: parseFloat(b.longitude) };
        else throw new Error('Branch missing coordinates');
      } catch (e) {
        // Fallback central Amman coords
        branchLocation = { lat: 31.9454, lng: 35.9284 };
      }

      // 3. Load zones (optional)
      let zones = [];
      try { zones = (await api.get('/shipping/zones')).data?.data?.zones || []; } catch (_) {}

      // 4. Primary Google Maps distance-based calc
      const gmResult = await googleMapsService.calculateDeliveryFee(branchLocation, customerLocation, zones, orderAmount);
      if (gmResult.success) {
        const d = gmResult.deliveryCalculation;
        const result = {
          total_shipping_cost: d.final_fee,
          delivery_fee: d.final_fee,
          free_shipping_applied: d.free_shipping_applied,
          zone_name: d.selected_zone?.name || 'Distance-based',
          zone_name_en: d.selected_zone?.name || 'Distance-based',
          distance_km: d.distance_km,
            distance: d.distance_km,
          duration_minutes: d.duration_minutes,
          duration_text: d.duration_text,
          calculation_method: 'google_maps_distance',
          base_cost: d.base_fee,
          free_shipping_threshold: d.selected_zone?.free_shipping_threshold,
          route_description: d.route_text
        };
        setShippingCalculation(result);
        return result;
      }

      // 5. Fallback zone-based quick calc
      const fallback = await calculateFallbackShipping(branchId, orderAmount);
      if (fallback) {
        setShippingCalculation(fallback);
        return fallback;
      }

      return null;
    } catch (err) {
      console.error('Shipping calc error:', err);
      const fallback = await calculateFallbackShipping(branchId, orderAmount);
      if (fallback) return fallback;
      return null;
    }
  };

  // Auto-calculate shipping when address or branch changes in create order
  const handleAddressChange = async (addressId) => {
    if (!addressId) {
      setShippingCalculation(null);
      orderForm.setFieldsValue({ delivery_fee: 0 });
      return;
    }

    const currentBranch = orderForm.getFieldValue('branch_id');
    const currentSubtotal = calculateCurrentSubtotal();
    
    // Check if we have both required values
    if (!currentBranch) {
      message.warning(t('orders.branch_required_for_shipping'));
      return;
    }
    
    if (currentBranch) {
      // Show loading state
      const loadingMessage = message.loading('Calculating shipping cost...', 0);
      
      try {
        const shippingData = await calculateShippingCost(addressId, currentBranch, currentSubtotal);
        loadingMessage(); // Hide loading message
        
        if (shippingData) {
          // Auto-update delivery fee in form
          orderForm.setFieldsValue({
            delivery_fee: shippingData.total_shipping_cost || 0
          });
          
          // Show shipping info to user
          message.success(
            `Shipping calculated: ${formatPrice(shippingData.total_shipping_cost || 0)} ${
              shippingData.free_shipping_applied ? '(Free shipping applied!)' : ''
            }`,
            3
          );
        } else {
          // If calculation failed, reset delivery fee and let user enter manually
          orderForm.setFieldsValue({ delivery_fee: 0 });
          message.info(t('orders.manual_delivery_fee'));
        }
      } catch (error) {
        loadingMessage(); // Hide loading message
        console.error('Error in handleAddressChange:', error);
        orderForm.setFieldsValue({ delivery_fee: 0 });
      }
    }
  };

  // Calculate current subtotal from selected items
  const calculateCurrentSubtotal = () => {
    if (selectedItems && selectedItems.length > 0) {
      return selectedItems.reduce((total, item) => total + (item.total_price || 0), 0);
    }
    return parseFloat(orderForm.getFieldValue('subtotal')) || 0;
  };

  // Auto-calculate shipping when branch changes in create order
  const handleBranchChange = async (branchId) => {
    const currentAddressId = orderForm.getFieldValue('delivery_address_id');
    const currentSubtotal = calculateCurrentSubtotal();
    
    if (currentAddressId && branchId) {
      const shippingData = await calculateShippingCost(currentAddressId, branchId, currentSubtotal);
      if (shippingData) {
        orderForm.setFieldsValue({
          delivery_fee: shippingData.delivery_fee
        });
      }
    }
  };


  const handleStatusUpdate = async () => {
    if (!selectedOrder || !selectedStatus) return;

    try {
      setStatusUpdateLoading(true);
      await ordersService.updateOrderStatus(selectedOrder.id, selectedStatus, statusNotes);
      
      // Acknowledge persistent notifications when order is processed
      if (['processing', 'ready', 'dispatched', 'delivered', 'completed', 'cancelled'].includes(selectedStatus)) {
        const storedNotifications = persistentNotificationSystem.getStoredNotifications();
        Object.entries(storedNotifications).forEach(([notificationId, data]) => {
          if (data.orderId === selectedOrder.id) {
            acknowledgePersistentNotification(notificationId);
            console.log(`✅ Acknowledged notification for order ${selectedOrder.id} - status changed to ${selectedStatus}`);
          }
        });
      }
      
      message.success(t('orders.status_updated_successfully'));
      setStatusUpdateVisible(false);
      setSelectedStatus('');
      setStatusNotes('');
      fetchOrders();
      fetchOrderCounts();
      // Update notification badge counter
      updatePendingCount();
    } catch (error) {
      console.error('Status update error:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        const { message: errorMessage, errors, message_ar } = error.response.data;
        
        if (errors && Array.isArray(errors)) {
          message.error({
            content: (
              <div>
                <strong>{t('common.validationFailed')}:</strong>
                <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 6
          });
        } else {
          message.error(errorMessage || error.message || t('orders.status_update_error'));
        }
      } else {
        message.error(error.message || t('orders.status_update_error'));
      }
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Quick status update without modal
  const handleQuickStatusUpdate = async (order, newStatus) => {
    try {
      await ordersService.updateOrderStatus(order.id, newStatus, `Quick update to ${newStatus}`);
      message.success(`Order status changed to ${newStatus}`);
      fetchOrders();
      fetchOrderCounts();
      updatePendingCount();
    } catch (error) {
      message.error(error.message || t('orders.status_update_failed'));
    }
  };

  // Update payment method
  const handlePaymentMethodUpdate = async (order, paymentMethod) => {
    try {
      setPaymentUpdateLoading(true);
      await ordersService.updatePaymentMethod(order.id, paymentMethod);
      message.success(t('orders.payment_method_updated') || 'Payment method updated successfully');
      fetchOrders();
    } catch (error) {
      message.error(error.message || t('orders.payment_method_update_failed') || 'Failed to update payment method');
    } finally {
      setPaymentUpdateLoading(false);
    }
  };

  // Update payment status
  const handlePaymentStatusUpdate = async (order, paymentStatus) => {
    try {
      setPaymentUpdateLoading(true);
      await ordersService.updatePaymentStatus(order.id, paymentStatus);
      message.success(t('orders.payment_status_updated') || 'Payment status updated successfully');
      fetchOrders();
    } catch (error) {
      message.error(error.message || t('orders.payment_status_update_failed') || 'Failed to update payment status');
    } finally {
      setPaymentUpdateLoading(false);
    }
  };

  // Generate and copy payment link
  const handleGeneratePaymentLink = async (order) => {
    try {
      setPaymentLinkLoading(true);
      const response = await ordersService.generatePaymentLink(order.id);
      const paymentLink = response.data.payment_link;
      setGeneratedPaymentLink(paymentLink);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(paymentLink);
      
      message.success({
        content: (
          <div>
            <strong>{t('orders.payment_link_generated') || 'Payment link generated and copied!'}</strong>
            <br />
            <small style={{ color: '#666' }}>
              {t('orders.link_copied_to_clipboard') || 'Link copied to clipboard'}
            </small>
          </div>
        ),
        duration: 5
      });
      
      setPaymentLinkVisible(true);
    } catch (error) {
      message.error(error.message || t('orders.payment_link_generation_failed') || 'Failed to generate payment link');
    } finally {
      setPaymentLinkLoading(false);
    }
  };

  // Copy payment link to clipboard
  const handleCopyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedPaymentLink);
      message.success(t('orders.link_copied') || 'Link copied to clipboard');
    } catch (error) {
      message.error(t('orders.copy_failed') || 'Failed to copy link');
    }
  };

  const handleCreateOrder = async (values) => {
    try {
      // Calculate basic totals
      const subtotal = parseFloat(values.subtotal) || 0;
      let deliveryFee = parseFloat(values.delivery_fee) || 0;
      const discountAmount = parseFloat(values.discount_amount) || 0;
      const taxAmount = parseFloat(values.tax_amount) || 0;
      
      // Auto-calculate shipping fee for delivery orders if not manually set
      if (values.order_type === 'delivery' && values.delivery_address_id && values.branch_id) {
        console.log('Auto-calculating shipping for new order...');
        const shippingData = await calculateShippingCost(
          values.delivery_address_id, 
          values.branch_id, 
          subtotal
        );
        
        if (shippingData && deliveryFee === 0) {
          deliveryFee = shippingData.delivery_fee;
          console.log('Auto-calculated delivery fee:', deliveryFee);
          
          // Update form field to show calculated fee
          orderForm.setFieldsValue({ delivery_fee: deliveryFee });
        }
      }
      
      const orderData = {
        ...values,
        // Include customer_id if a customer was selected (enables proper admin order notifications)
        customer_id: selectedCustomerForOrder?.id || null,
        // Ensure required fields are present
        branch_id: values.branch_id || branches[0]?.id || 635, // Default to first branch or fallback
        customer_name: values.customer_name || 'Admin Created Order',
        customer_phone: values.customer_phone || '0000000000', // Default phone if not provided
        customer_email: values.customer_email || '',
        order_type: values.order_type || 'delivery',
        payment_method: values.payment_method || 'cash',
        subtotal,
        delivery_fee: deliveryFee,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: subtotal + deliveryFee + taxAmount - discountAmount,
        items: selectedItems.length > 0 ? selectedItems : [
          // Default item if no items selected
          {
            product_id: 1,
            quantity: 1,
            unit_price: subtotal,
            total_price: subtotal
          }
        ]
      };

      console.log('🚀 [ADMIN DEBUG] Creating order with data:', {
        selectedCustomer: selectedCustomerForOrder,
        customer_id: orderData.customer_id,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_email: orderData.customer_email,
        total_amount: orderData.total_amount,
        orderType: 'admin_created',
        hasCustomerSelected: !!selectedCustomerForOrder
      });

      console.log('🚀 [ADMIN DEBUG] Full order data being sent:', JSON.stringify(orderData, null, 2));

      console.log('Creating order with calculated shipping:', {
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: orderData.total_amount,
        shipping_calculation: shippingCalculation
      });

      const response = await ordersService.createOrder(orderData);
      console.log('🚀 [ADMIN DEBUG] Order creation response:', response);
      
      message.success(t('orders.created_successfully'));
      setCreateOrderVisible(false);
      orderForm.resetFields();
      setSelectedItems([]);
      setSelectedCustomerForOrder(null);
      setCustomerAddresses([]);
      setShippingCalculation(null); // Reset shipping calculation
      fetchOrders();
      fetchOrderCounts();
      // Update notification badge counter
      updatePendingCount();
      
      console.log('🚀 [ADMIN DEBUG] Order creation completed successfully');
    } catch (error) {
      console.error('🚀 [ADMIN DEBUG] Create order error:', error);
      message.error(error.message || t('orders.create_order_failed'));
    }
  };

  const handleEditOrder = async (values) => {
    if (!editingOrder) return;

    try {
      // Calculate current order total
      const currentSubtotal = calculateOrderTotal();
      let deliveryFee = Number(values.delivery_fee || 0);
      
      // Auto-recalculate shipping if address or branch changed and it's a delivery order
      if (values.order_type === 'delivery' && values.delivery_address_id && values.branch_id) {
        // Check if we need to recalculate shipping
        const addressChanged = values.delivery_address_id !== editingOrder.delivery_address_id;
        const branchChanged = values.branch_id !== editingOrder.branch_id;
        const subtotalChanged = Math.abs(currentSubtotal - (editingOrder.subtotal || 0)) > 0.01;
        
        if (addressChanged || branchChanged || subtotalChanged) {
          console.log('Recalculating shipping due to changes:', {
            addressChanged,
            branchChanged,
            subtotalChanged,
            oldSubtotal: editingOrder.subtotal,
            newSubtotal: currentSubtotal
          });
          
          // Extract address ID if it's in formatted text
          let addressId = values.delivery_address_id;
          if (typeof addressId === 'string' && addressId.includes('Address ID:')) {
            addressId = addressId.replace('Address ID:', '').trim();
          } else if (typeof addressId === 'string' && addressId.includes('|')) {
            // Use original address ID for formatted text
            addressId = editingOrder.original_delivery_address_id || editingOrder.delivery_address_id;
          }
          
          const shippingData = await calculateShippingCost(
            addressId, 
            values.branch_id, 
            currentSubtotal
          );
          
          if (shippingData) {
            deliveryFee = shippingData.delivery_fee;
            console.log('Recalculated delivery fee:', deliveryFee);
            
            // Show notification about shipping recalculation
            message.info(
              `Shipping fee recalculated: ${formatPrice(deliveryFee)} ${
                shippingData.free_shipping_applied ? '(Free shipping applied!)' : ''
              }`
            );
          }
        }
      }

      // Prepare order data with proper delivery address handling
      const orderData = {
        ...values,
        delivery_fee: deliveryFee,
        items: editOrderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        subtotal: currentSubtotal,
        total_amount: currentSubtotal + deliveryFee + Number(values.tax_amount || 0) - Number(values.discount_amount || 0)
      };

      // Handle delivery address for delivery orders
      if (values.order_type === 'delivery') {
        // If delivery_address_id is a formatted text (contains '|'), keep the original delivery_address_id from the order
        if (values.delivery_address_id && values.delivery_address_id.includes('|')) {
          // This is formatted text, use the original delivery_address_id from the editing order
          if (editingOrder.original_delivery_address_id || editingOrder.delivery_address_id) {
            orderData.delivery_address_id = editingOrder.original_delivery_address_id || editingOrder.delivery_address_id;
          } else {
            // If no original delivery_address_id, convert the formatted text to a simple address string
            orderData.delivery_address = values.delivery_address_id;
            delete orderData.delivery_address_id;
          }
        } else if (values.delivery_address_id && values.delivery_address_id.startsWith('Address ID:')) {
          // Handle "Address ID: 123" format
          const addressId = values.delivery_address_id.replace('Address ID:', '').trim();
          orderData.delivery_address_id = addressId;
        } else {
          // This is likely a proper delivery address ID or simple address
          orderData.delivery_address_id = values.delivery_address_id;
        }
      } else {
        // For pickup orders, remove delivery address fields
        delete orderData.delivery_address_id;
        delete orderData.delivery_address;
        orderData.delivery_fee = 0; // No delivery fee for pickup orders
      }

      // Verify that the selected address belongs to the customer
      if (values.order_type === 'delivery' && values.delivery_address_id) {
        const selectedAddress = customerAddresses.find(addr => 
          String(addr.id || addr.address_id) === String(values.delivery_address_id)
        );
        
        if (!selectedAddress) {
          message.error({
            content: (
              <div>
                <div><strong>{t('orders.address_selection_error')}</strong></div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {t('orders.address_not_in_list')}
                </div>
              </div>
            ),
            duration: 6
          });
          return;
        }
        
        console.log('Address validation passed:', {
          selected_address_id: values.delivery_address_id,
          address_details: selectedAddress,
          customer_addresses_count: customerAddresses.length
        });
      }

      console.log('Sending updated order data:', orderData);
      console.log('Debug - Address validation details:', {
        delivery_address_id: orderData.delivery_address_id,
        order_type: orderData.order_type,
        customer_phone: orderData.customer_phone,
        existing_user_id: editingOrder.user_id
      });

      await ordersService.updateOrder(editingOrder.id, orderData);
      message.success(t('orders.updated_successfully') || 'Order updated successfully');
      setEditOrderVisible(false);
      setEditingOrder(null);
      setEditOrderItems([]);
      setShippingCalculation(null); // Reset shipping calculation
      orderForm.resetFields();
      fetchOrders();
      // Update notification badge counter
      updatePendingCount();
    } catch (error) {
      console.error('Edit order error:', error);
      
      // Enhanced error handling for delivery address issues
      if (error.response?.data?.message) {
        const errorMessage = error.response.data.message;
        const errorMessageAr = error.response.data.message_ar;
        const details = error.response.data.details;
        
        if (errorMessage.includes('delivery address') || errorMessage.includes('address')) {
          // Provide more helpful feedback for address validation errors
          message.error({
            content: (
              <div>
                <div><strong>{t('orders.delivery_address_error')}</strong></div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {errorMessage}
                  {details && (
                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#666' }}>
                      {t('orders.technical_details')}: {details}
                    </div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <strong>{t('orders.solutions')}:</strong>
                    <ul style={{ marginTop: '4px', marginBottom: 0, paddingLeft: '20px' }}>
                      <li>{t('orders.click_refresh_addresses')}</li>
                      <li>{t('orders.select_different_address')}</li>
                      <li>{t('orders.add_new_address_solution')}</li>
                      <li>{t('orders.customer_link_issue')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            ),
            duration: 12
          });
          
          // If it's a user mismatch, offer to refresh addresses
          if (details && details.includes('user')) {
            setTimeout(() => {
              Modal.confirm({
                title: t('orders.address_user_mismatch'),
                content: (
                  <div>
                    <p>{t('orders.address_user_mismatch_content')}</p>
                    <p>{t('orders.refresh_addresses_question')}</p>
                  </div>
                ),
                onOk: async () => {
                  const customerPhone = orderForm.getFieldValue('customer_phone');
                  if (customerPhone) {
                    await fetchCustomerAddresses(customerPhone);
                    message.success(t('orders.address_refresh_success'));
                  }
                }
              });
            }, 2000);
          }
        } else {
          message.error(errorMessage);
        }
      } else {
        message.error(error.message || t('orders.update_error') || 'Failed to update order');
      }
    }
  };

  const handleDeleteOrder = async (order) => {
    try {
      await ordersService.deleteOrder(order.id);
      message.success(t('orders.deleted_successfully'));
      fetchOrders();
      fetchOrderCounts();
      // Update notification badge counter
      updatePendingCount();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handlePrintInvoice = (order) => {
    const printWindow = window.open('', '_blank');
    const invoiceHtml = generateInvoiceHTML(order);
    
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const generateInvoiceHTML = (order) => {
    const currentDate = new Date().toLocaleDateString();
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Invoice #${order.order_number}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .invoice-title { font-size: 20px; margin-top: 10px; }
            .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .invoice-details, .customer-details { width: 48%; }
            .invoice-details h3, .customer-details h3 { margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .items-table th { background-color: #f5f5f5; font-weight: bold; }
            .items-table .qty-col { text-align: center; width: 80px; }
            .items-table .price-col { text-align: right; width: 100px; }
            .totals { float: right; width: 300px; }
            .totals table { width: 100%; }
            .totals td { padding: 8px; border-bottom: 1px solid #eee; }
            .totals .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #333; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
            .delivery-address { margin-top: 15px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; }
            @media print {
                body { margin: 0; }
                .header { page-break-inside: avoid; }
                .invoice-info { page-break-inside: avoid; }
                .items-table { page-break-inside: avoid; }
                .totals { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">FECS Restaurant</div>
            <div class="invoice-title">INVOICE</div>
        </div>
        
        <div class="invoice-info">
            <div class="invoice-details">
                <h3>Invoice Details</h3>
                <p><strong>Invoice #:</strong> ${order.order_number}</p>
                <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                <p><strong>Print Date:</strong> ${currentDate}</p>
                <p><strong>Status:</strong> ${order.order_status.toUpperCase()}</p>
                <p><strong>Payment:</strong> ${order.payment_method.toUpperCase()} (${order.payment_status.toUpperCase()})</p>
            </div>
            
            <div class="customer-details">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> ${order.customer_name}</p>
                <p><strong>Phone:</strong> ${order.customer_phone}</p>
                ${order.customer_email ? `<p><strong>Email:</strong> ${order.customer_email}</p>` : ''}
                <p><strong>Order Type:</strong> ${order.order_type.toUpperCase()}</p>
                
                ${order.order_type === 'delivery' && order.delivery_address ? `
                <div class="delivery-address">
                    <strong>Delivery Address:</strong><br>
                    ${order.delivery_address.full_name ? `${order.delivery_address.full_name}<br>` : ''}
                    ${order.delivery_address.address_line}<br>
                    ${order.delivery_address.city}, ${order.delivery_address.governorate}
                    ${order.delivery_address.phone ? `<br>Phone: ${order.delivery_address.phone}` : ''}
                </div>
                ` : ''}
            </div>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th class="qty-col">Qty</th>
                    <th class="price-col">Unit Price</th>
                    <th class="price-col">Total</th>
                </tr>
            </thead>
            <tbody>
                ${order.items ? order.items.map(item => {
                    const productName = item?.product_name || item?.product_title_en || item?.product_title_ar || 'Unknown Product';
                    const quantity = Number(item?.quantity || 0);
                    const unitPrice = Number(item?.unit_price || item?.price || 0);
                    
                    return `
                    <tr>
                        <td>${productName}</td>
                        <td class="qty-col">${quantity}</td>
                        <td class="price-col">${formatPrice(unitPrice)}</td>
                        <td class="price-col">${formatPrice(unitPrice * quantity)}</td>
                    </tr>
                    `;
                }).join('') : '<tr><td colspan="4">No items available</td></tr>'}
            </tbody>
        </table>
        
        <div class="totals">
            <table>
                <tr>
                    <td>Subtotal:</td>
                    <td style="text-align: right;">${formatPrice(order.subtotal || 0)}</td>
                </tr>
                ${(order.delivery_fee && Number(order.delivery_fee) > 0) ? `
                <tr>
                    <td>Delivery Fee:</td>
                    <td style="text-align: right;">${formatPrice(order.delivery_fee)}</td>
                </tr>
                ` : ''}
                ${(order.tax_amount && Number(order.tax_amount) > 0) ? `
                <tr>
                    <td>Tax:</td>
                    <td style="text-align: right;">${formatPrice(order.tax_amount)}</td>
                </tr>
                ` : ''}
                ${(order.discount_amount && Number(order.discount_amount) > 0) ? `
                <tr>
                    <td>Discount:</td>
                    <td style="text-align: right;">-${formatPrice(order.discount_amount)}</td>
                </tr>
                ` : ''}
                ${(order.points_used && Number(order.points_used) > 0) ? `
                <tr>
                    <td>Points Used:</td>
                    <td style="text-align: right;">-${order.points_used} pts</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                    <td>TOTAL:</td>
                    <td style="text-align: right;">${formatPrice(order.total_amount || 0)}</td>
                </tr>
            </table>
        </div>
        
        <div class="footer">
            <p>Thank you for your business!</p>
            <p>This invoice was generated on ${currentDate}</p>
            ${order.special_instructions ? `<p><strong>Special Instructions:</strong> ${order.special_instructions}</p>` : ''}
        </div>
    </body>
    </html>
    `;
  };

  const showCreateModal = () => {
    orderForm.resetFields();
    setSelectedItems([]);
    setSelectedCustomerForOrder(null);
    setCustomerAddresses([]);
    setCreateOrderVisible(true);
    // Load initial customer list
    fetchCustomers();
  };

  const showEditModal = async (order) => {
    setEditingOrder(order);
    
    try {
      // Always ensure products are loaded before opening modal
      if (products.length === 0 || availableProducts.length === 0) {
        console.log('Products not loaded, fetching...');
        await fetchProducts();
      }
      
      // Double check that we have products after fetching
      const currentProducts = products.length > 0 ? products : availableProducts;
      console.log('Edit modal opened. Products available:', currentProducts.length);
      console.log('Sample product with price:', currentProducts[0] ? {
        id: currentProducts[0].id,
        name: currentProducts[0].name || currentProducts[0].title_en,
        price: currentProducts[0].price,
        unit_price: currentProducts[0].unit_price,
        selling_price: currentProducts[0].selling_price
      } : 'None');
      
      // If still no products, use mock data directly
      if (currentProducts.length === 0) {
        console.warn('No products loaded, setting mock products...');
        const mockProducts = [
          { id: 1, title_en: 'Chicken Burger', title_ar: 'برجر دجاج', price: 12.99, sku: 'CB001' },
          { id: 2, title_en: 'Beef Burger', title_ar: 'برجر لحم', price: 15.99, sku: 'BB001' },
          { id: 3, title_en: 'Fries', title_ar: 'بطاطا مقلية', price: 5.99, sku: 'FR001' },
          { id: 4, title_en: 'Soft Drink', title_ar: 'مشروب غازي', price: 2.99, sku: 'SD001' }
        ];
        setProducts(mockProducts);
        setAvailableProducts(mockProducts);
        console.log('Forced mock products loaded:', mockProducts);
      }
      
      // Fetch detailed order information including items if not already loaded
      let orderItems = order.items || [];
      let completeOrder = order;
      
      // If order doesn't have items or detailed delivery address, try to fetch them
      if ((!orderItems.length || !order.delivery_address) && order.id) {
        try {
          console.log('Fetching complete order details for edit...');
          const response = await ordersService.getOrder(order.id);
          if (response.success && response.data) {
            const { order: orderDetails, items } = response.data;
            console.log('Raw orderDetails from API:', orderDetails);
            console.log('Available address fields:', {
              address_line: orderDetails.address_line,
              address_details: orderDetails.address_details,
              address_name: orderDetails.address_name,
              building_no: orderDetails.building_no,
              floor_no: orderDetails.floor_no,
              apartment_no: orderDetails.apartment_no,
              city_title_en: orderDetails.city_title_en,
              area_title_en: orderDetails.area_title_en,
              delivery_address: orderDetails.delivery_address
            });
            
            if (items && items.length > 0) {
              orderItems = items;
            }
            // Merge the complete order data
            completeOrder = {
              ...order,
              ...orderDetails,
              delivery_address: orderDetails.delivery_address || (orderDetails.delivery_address_id ? {
                full_name: orderDetails.address_name || orderDetails.customer_name || 'Unknown',
                address_line: orderDetails.address_line || 
                             orderDetails.address_details || 
                             [
                               orderDetails.building_no && `Building ${orderDetails.building_no}`,
                               orderDetails.floor_no && `Floor ${orderDetails.floor_no}`,
                               orderDetails.apartment_no && `Apt ${orderDetails.apartment_no}`,
                               orderDetails.street_title_en,
                               orderDetails.area_title_en
                             ].filter(Boolean).join(', ') ||
                             `Delivery Address ${orderDetails.delivery_address_id}`,
                city: orderDetails.city_title_en || orderDetails.city || 'Unknown City',
                governorate: orderDetails.area_title_en || orderDetails.area || orderDetails.governorate || 'Unknown Area',
                phone: orderDetails.customer_phone || orderDetails.phone
              } : null) || order.delivery_address
            };
            console.log('Complete order with delivery address:', completeOrder);
          }
        } catch (error) {
          console.warn('Could not fetch complete order details:', error);
          // Continue with existing data
        }
      }
      
      // Set current order items for editing with proper mapping
      setEditOrderItems(orderItems.map(item => ({
        id: item.id || Date.now() + Math.random(),
        product_id: item.product_id,
        product_name: item.product_name || item.product_title_en || item.product_title_ar || 'Unknown Product',
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || item.price || 0),
        total_price: Number(item.total_price || (item.unit_price || item.price || 0) * (item.quantity || 1))
      })));
      
      // Prepare delivery address display text
      let deliveryAddressText = '';
      if (completeOrder.delivery_address) {
        const addr = completeOrder.delivery_address;
        deliveryAddressText = [
          addr.full_name,
          addr.address_line,
          `${addr.city}, ${addr.governorate}`,
          addr.phone ? `Phone: ${addr.phone}` : ''
        ].filter(Boolean).join(' | ');
      } else if (completeOrder.delivery_address_id) {
        deliveryAddressText = `Address ID: ${completeOrder.delivery_address_id}`;
      }
      
      console.log('Order data for edit modal:', {
        id: completeOrder.id,
        order_type: completeOrder.order_type,
        delivery_address_id: completeOrder.delivery_address_id,
        delivery_address: completeOrder.delivery_address,
        deliveryAddressText: deliveryAddressText
      });
      
      console.log('Setting form with delivery address:', deliveryAddressText);
      console.log('Original delivery_address_id:', completeOrder.delivery_address_id);
      
      // Store the complete order with original delivery_address_id for reference
      setEditingOrder({
        ...completeOrder,
        original_delivery_address_id: completeOrder.delivery_address_id // Preserve original ID
      });

      // Load customer addresses if we have a phone number
      if (completeOrder.customer_phone) {
        try {
          await fetchCustomerAddresses(completeOrder.customer_phone);
          console.log('Customer addresses loaded for edit order');
        } catch (error) {
          console.error('Error loading customer addresses:', error);
        }
      }
      
      // Calculate shipping for existing delivery orders
      if (completeOrder.order_type === 'delivery' && 
          completeOrder.delivery_address_id && 
          completeOrder.branch_id) {
        try {
          const calculation = await calculateShippingCost(
            completeOrder.delivery_address_id, 
            completeOrder.branch_id, 
            completeOrder.subtotal || 0
          );
          if (calculation) {
            setShippingCalculation(calculation);
            console.log('Shipping calculation loaded for edit order:', calculation);
            // Ensure form shows the calculated delivery fee
            orderForm.setFieldsValue({ delivery_fee: calculation.total_shipping_cost || calculation.delivery_fee || 0 });
          }
        } catch (error) {
          console.error('Error calculating shipping for edit order:', error);
        }
      }

      orderForm.setFieldsValue({
        customer_name: completeOrder.customer_name,
        customer_phone: completeOrder.customer_phone,
        customer_email: completeOrder.customer_email,
        special_instructions: completeOrder.special_instructions,
        estimated_delivery_time: completeOrder.estimated_delivery_time ? moment(completeOrder.estimated_delivery_time) : null,
        order_type: completeOrder.order_type,
        // Always store the ID (string) so Select can resolve and show its label
        delivery_address_id: (completeOrder.delivery_address_id ? String(completeOrder.delivery_address_id) : ''),
        branch_id: completeOrder.branch_id,
        subtotal: completeOrder.subtotal,
        delivery_fee: completeOrder.delivery_fee,
        points_to_use: completeOrder.points_to_use,
        total_amount: completeOrder.total_amount
      });
      
      // Fetch latest customer addresses for accurate validation
      if (completeOrder.customer_phone) {
        console.log('Fetching customer addresses for edit modal...');
        await fetchCustomerAddresses(completeOrder.customer_phone, completeOrder.user_id);
      }
      
      console.log('Form values set:', {
        customer_name: completeOrder.customer_name,
        customer_phone: completeOrder.customer_phone,
        customer_email: completeOrder.customer_email,
        order_type: completeOrder.order_type,
        delivery_address_id: deliveryAddressText || completeOrder.delivery_address_id
      });
      
      setEditOrderVisible(true);
    } catch (error) {
      console.error('Error opening edit modal:', error);
      message.error(t('orders.failed_to_load_order') || 'Failed to load order details');
    }
  };

  // Address editing functions
  const handleEditAddress = () => {
    setShowAddressEditor(true);
    // If there's a selected address, populate the form for editing
    const currentAddressId = orderForm.getFieldValue('delivery_address_id');
    if (currentAddressId && customerAddresses.length > 0) {
      const address = customerAddresses.find(addr => 
        String(addr.id || addr.address_id) === String(currentAddressId)
      );
      if (address) {
        setEditingAddress(address);
        addressForm.setFieldsValue({
          name: address.name || address.address_name,
          address_line_1: address.address_line_1,
          building_no: address.building_no,
          latitude: address.latitude,
          longitude: address.longitude,
          city_id: address.city_id,
          area_id: address.area_id,
          street_id: address.street_id
        });
      }
    }
  };

  const handleAddressFormFinish = async (values) => {
    try {
      const customerPhone = orderForm.getFieldValue('customer_phone');
      if (!customerPhone) {
        message.error(t('orders.customer_phone_required'));
        return;
      }

      // Find or create user
      let userId;
      try {
        const userResponse = await api.get(`/users?phone=${customerPhone}&limit=1`);
        if (userResponse.data.success && userResponse.data.data.length > 0) {
          userId = userResponse.data.data[0].id;
        } else {
          // Create new user
          const createUserResponse = await api.post('/users', {
            name: orderForm.getFieldValue('customer_name'),
            phone: customerPhone,
            email: orderForm.getFieldValue('customer_email')
          });
          userId = createUserResponse.data.data.id;
        }
      } catch (error) {
        console.error('Error handling user:', error);
        message.error(t('orders.failed_to_handle_customer'));
        return;
      }

      const addressData = {
        ...values,
        user_id: userId,
        is_default: customerAddresses.length === 0 // Make first address default
      };

      let response;
      if (editingAddress) {
        // Update existing address
        response = await api.put(`/addresses/${editingAddress.id || editingAddress.address_id}`, addressData);
      } else {
        // Create new address
        response = await api.post('/addresses', addressData);
      }

      if (response.data.success) {
        message.success(editingAddress ? t('orders.address_updated_successfully') : t('orders.address_created_successfully'));
        setShowAddressEditor(false);
        setEditingAddress(null);
        addressForm.resetFields();
        
        // Refresh customer addresses
        await fetchCustomerAddresses(customerPhone, userId);
        
        // Set the new/updated address as selected
        const addressId = String(response.data.data.id || response.data.data.address_id);
        orderForm.setFieldsValue({ delivery_address_id: addressId });
        
        // Recalculate shipping if needed
        const branchId = orderForm.getFieldValue('branch_id');
        const subtotal = calculateOrderTotal();
        if (orderForm.getFieldValue('order_type') === 'delivery' && branchId) {
          try {
            const calculation = await calculateShippingCost(addressId, branchId, subtotal);
            if (calculation) {
              setShippingCalculation(calculation);
              orderForm.setFieldsValue({ delivery_fee: calculation.total_shipping_cost || 0 });
            }
          } catch (err) {
            console.error('Error recalculating shipping:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error saving address:', error);
      message.error(t('orders.failed_to_save_address'));
    }
  };

  const handleCancelAddressEdit = () => {
    setShowAddressEditor(false);
    setEditingAddress(null);
    addressForm.resetFields();
  };

  // Fetch location data for address form
  const fetchCities = async () => {
    try {
      const response = await api.get('/locations/cities');
      if (response.data.success) {
        setCities(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchAreas = async (cityId) => {
    try {
      const response = await api.get(`/locations/areas?city_id=${cityId}`);
      if (response.data.success) {
        setAreas(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const fetchStreets = async (areaId) => {
    try {
      const response = await api.get(`/locations/streets?area_id=${areaId}`);
      if (response.data.success) {
        setStreets(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching streets:', error);
    }
  };

  const handleCityChange = (cityId) => {
    addressForm.setFieldsValue({ area_id: null, street_id: null });
    setAreas([]);
    setStreets([]);
    if (cityId) {
      fetchAreas(cityId);
    }
  };

  const handleAreaChange = (areaId) => {
    addressForm.setFieldsValue({ street_id: null });
    setStreets([]);
    if (areaId) {
      fetchStreets(areaId);
    }
  };

  // Functions for managing items in edit modal
  const addItemToOrder = () => {
    try {
      const newItem = {
        id: Date.now() + Math.random(),
        product_id: null,
        product_name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0
      };
      setEditOrderItems(prevItems => [...prevItems, newItem]);
      message.success(t('orders.item_added') || 'New item added successfully');
    } catch (error) {
      console.error('Error adding item:', error);
      message.error(t('orders.item_add_error') || 'Failed to add new item');
    }
  };

  const removeItemFromOrder = (itemId) => {
    try {
      setEditOrderItems(prevItems => prevItems.filter(item => item.id !== itemId));
      message.success(t('orders.item_removed') || 'Item removed successfully');
    } catch (error) {
      console.error('Error removing item:', error);
      message.error(t('orders.item_remove_error') || 'Failed to remove item');
    }
  };

  const updateOrderItem = (itemId, field, value) => {
    try {
      setEditOrderItems(prevItems => prevItems.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate total when quantity or unit_price changes
          if (field === 'quantity' || field === 'unit_price') {
            updatedItem.total_price = Number(updatedItem.quantity) * Number(updatedItem.unit_price);
          }
          
          // Update product info when product is selected
          if (field === 'product_id' && value) {
            const selectedProduct = products.find(p => p.id === value);
            console.log('Selected product:', selectedProduct, 'from products:', products.length);
            if (selectedProduct) {
              updatedItem.product_name = language === 'ar' ? 
                (selectedProduct.title_ar || selectedProduct.title_en || selectedProduct.name) :
                (selectedProduct.title_en || selectedProduct.title_ar || selectedProduct.name);
              
              // Check multiple possible price fields - Updated for correct backend fields
              const productPrice = selectedProduct.final_price ||  // Backend calculated price (preferred)
                                 selectedProduct.sale_price ||     // Backend sale price
                                 selectedProduct.base_price ||     // Backend base price
                                 selectedProduct.price ||          // Legacy field (fallback)
                                 selectedProduct.unit_price ||     // Legacy field (fallback)
                                 selectedProduct.selling_price ||  // Legacy field (fallback)
                                 0;
              
              console.log('Product price debugging:');
              console.log('- selectedProduct.final_price:', selectedProduct.final_price, typeof selectedProduct.final_price);
              console.log('- selectedProduct.sale_price:', selectedProduct.sale_price, typeof selectedProduct.sale_price);
              console.log('- selectedProduct.base_price:', selectedProduct.base_price, typeof selectedProduct.base_price);
              console.log('- selectedProduct.price (legacy):', selectedProduct.price, typeof selectedProduct.price);
              console.log('- selectedProduct.unit_price (legacy):', selectedProduct.unit_price, typeof selectedProduct.unit_price);
              console.log('- selectedProduct.selling_price (legacy):', selectedProduct.selling_price, typeof selectedProduct.selling_price);
              console.log('- Final productPrice:', productPrice, typeof productPrice);
              console.log('- Number(productPrice):', Number(productPrice));
              
              updatedItem.unit_price = Number(productPrice);
              updatedItem.total_price = Number(updatedItem.quantity) * Number(productPrice);
              console.log('Updated item with product:', updatedItem);
            } else {
              console.warn('Product not found with ID:', value);
            }
          }
          
          return updatedItem;
        }
        return item;
      }));
    } catch (error) {
      console.error('Error updating order item:', error);
      message.error(t('orders.item_update_error') || 'Failed to update item');
    }
  };

  const calculateOrderTotal = () => {
    return editOrderItems.reduce((total, item) => total + Number(item.total_price || 0), 0);
  };

  const handleCancelOrder = async (order) => {
    Modal.confirm({
      title: t('orders.cancel_confirm_title'),
      content: t('orders.cancel_confirm_message'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          await ordersService.cancelOrder(order.id, 'Cancelled by admin');
          message.success(t('orders.cancelled_successfully'));
          fetchOrders();
          fetchOrderCounts();
          // Update notification badge counter
          updatePendingCount();
        } catch (error) {
          message.error(error.message);
        }
      }
    });
  };

  const handleViewDetails = async (order) => {
    try {
      setDetailsVisible(true);
      setDetailsLoading(true);
      
      // Acknowledge any persistent notifications for this order
      const storedNotifications = persistentNotificationSystem.getStoredNotifications();
      Object.entries(storedNotifications).forEach(([notificationId, data]) => {
        if (data.orderId === order.id) {
          acknowledgePersistentNotification(notificationId);
          console.log(`✅ Acknowledged notification for order ${order.id}`);
        }
      });
      
      // Set basic order data immediately with fallbacks
      const safeOrder = {
        id: order?.id || 'N/A',
        order_number: order?.order_number || 'N/A',
        customer_name: order?.customer_name || 'Unknown Customer',
        customer_phone: order?.customer_phone || 'N/A',
        customer_email: order?.customer_email || null,
        order_status: order?.order_status || 'pending',
        payment_status: order?.payment_status || 'pending',
        order_type: order?.order_type || 'pickup',
        payment_method: order?.payment_method || 'cash',
        total_amount: Number(order?.total_amount || 0),
        subtotal: Number(order?.subtotal || 0),
        delivery_fee: Number(order?.delivery_fee || 0),
        tax_amount: Number(order?.tax_amount || 0),
        discount_amount: Number(order?.discount_amount || 0),
        points_used: Number(order?.points_used || 0),
        points_earned: Number(order?.points_earned || 0),
        created_at: order?.created_at || null,
        updated_at: order?.updated_at || null,
        estimated_delivery_time: order?.estimated_delivery_time || null,
        delivered_at: order?.delivered_at || null,
        cancelled_at: order?.cancelled_at || null,
        items: order?.items || [],
        ...order // Spread the rest of the order properties
      };
      
      setSelectedOrder(safeOrder);
      
      // Fetch complete order details including items
      console.log('Fetching detailed order data for order ID:', order.id);
      const response = await ordersService.getOrder(order.id);
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        const { order: orderDetails, items, status_history } = response.data;
        
        // Create complete order object with proper data handling
        const completeOrder = {
          // Basic order information with fallbacks
          id: orderDetails?.id || safeOrder.id,
          order_number: orderDetails?.order_number || safeOrder.order_number,
          customer_name: orderDetails?.customer_name || orderDetails?.first_name && orderDetails?.last_name 
            ? `${orderDetails.first_name} ${orderDetails.last_name}` 
            : safeOrder.customer_name,
          customer_phone: orderDetails?.customer_phone || orderDetails?.phone || safeOrder.customer_phone,
          customer_email: orderDetails?.customer_email || orderDetails?.user_email || orderDetails?.email || safeOrder.customer_email,
          
          // Order status and type
          order_status: orderDetails?.order_status || safeOrder.order_status,
          payment_status: orderDetails?.payment_status || safeOrder.payment_status,
          order_type: orderDetails?.order_type || safeOrder.order_type,
          payment_method: orderDetails?.payment_method || safeOrder.payment_method,
          
          // Financial data with proper number conversion
          total_amount: Number(orderDetails?.total_amount || safeOrder.total_amount),
          subtotal: Number(orderDetails?.subtotal || safeOrder.subtotal),
          delivery_fee: Number(orderDetails?.delivery_fee || safeOrder.delivery_fee),
          tax_amount: Number(orderDetails?.tax_amount || safeOrder.tax_amount),
          discount_amount: Number(orderDetails?.discount_amount || safeOrder.discount_amount),
          points_used: Number(orderDetails?.points_used || safeOrder.points_used),
          points_earned: Number(orderDetails?.points_earned || safeOrder.points_earned),
          
          // Dates with validation
          created_at: orderDetails?.created_at || safeOrder.created_at,
          updated_at: orderDetails?.updated_at || safeOrder.updated_at,
          estimated_delivery_time: orderDetails?.estimated_delivery_time || safeOrder.estimated_delivery_time,
          delivered_at: orderDetails?.delivered_at || safeOrder.delivered_at,
          cancelled_at: orderDetails?.cancelled_at || safeOrder.cancelled_at,
          
          // Branch information
          branch_title_en: orderDetails?.branch_title_en || 'Unknown Branch',
          branch_title_ar: orderDetails?.branch_title_ar || null,
          
          // Delivery address with proper structure
          delivery_address: orderDetails?.delivery_address_id ? {
            full_name: orderDetails?.address_name || orderDetails?.customer_name || 'Unknown',
            address_line: orderDetails?.address_line || orderDetails?.address_details || 'Address not available',
            city: orderDetails?.city_title_en || orderDetails?.city || 'Unknown City',
            governorate: orderDetails?.area_title_en || orderDetails?.area || orderDetails?.governorate || 'Unknown Area',
            phone: orderDetails?.customer_phone || orderDetails?.phone,
            latitude: orderDetails?.latitude || null,
            longitude: orderDetails?.longitude || null
          } : null,
          
          // Promo code information
          promo_code: orderDetails?.promo_code || null,
          
          // Special instructions and notes
          special_instructions: orderDetails?.special_instructions || null,
          cancellation_reason: orderDetails?.cancellation_reason || null,
          
          // Shipping information
          shipping_zone_name_en: orderDetails?.shipping_zone_name_en || null,
          shipping_zone_name_ar: orderDetails?.shipping_zone_name_ar || null,
          calculated_distance_km: orderDetails?.calculated_distance_km || null,
          calculation_method: orderDetails?.calculation_method || null,
          free_shipping_applied: orderDetails?.free_shipping_applied || false,
          
          // Gift card information
          gift_card_id: orderDetails?.gift_card_id || null,
          
          // Order items with proper structure
          items: Array.isArray(items) ? items.map(item => ({
            id: item?.id || null,
            product_id: item?.product_id || null,
            product_name: item?.product_name || item?.product_title_en || item?.product_title_ar || 'Unknown Product',
            product_title_en: item?.product_title_en || item?.product_name || 'Unknown Product',
            product_title_ar: item?.product_title_ar || null,
            product_sku: item?.product_sku || item?.sku || null,
            quantity: Number(item?.quantity || 0),
            unit_price: Number(item?.unit_price || item?.price || 0),
            total_price: Number(item?.total_price || (item?.unit_price || item?.price || 0) * (item?.quantity || 0)),
            variant_id: item?.variant_id || null,
            variant_name: item?.variant_name || null,
            variant_value: item?.variant_value || null,
            variant_sku: item?.variant_sku || null,
            product_image: item?.product_image || item?.main_image || null
          })) : [],
          
          // Status history
          status_history: Array.isArray(status_history) ? status_history : []
        };
        
        console.log('Processed complete order:', completeOrder);
        setSelectedOrder(completeOrder);
      } else {
        console.error('Invalid API response structure:', response);
        message.warning('Order details loaded with limited information');
        // Keep the safe order data if API response is invalid
      }
      
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      message.error('Failed to load order details');
      // Still show modal with basic data if API fails
      // selectedOrder should already be set with safe data
    } finally {
      setDetailsLoading(false);
    }
  };

  // Bulk selection functions
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const hasSelected = selectedRowKeys.length > 0;

  const handleBulkDelete = async () => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: t('orders.bulk_delete_confirm_title'),
      content: t('orders.bulk_delete_confirm_message', { count: selectedRowKeys.length }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          await Promise.all(selectedRowKeys.map(id => ordersService.deleteOrder(id)));
          message.success(t('orders.bulk_deleted_successfully', { count: selectedRowKeys.length }));
          setSelectedRowKeys([]);
          fetchOrders();
          fetchOrderCounts();
          updatePendingCount();
        } catch (error) {
          message.error(t('orders.bulk_delete_error'));
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!hasSelected) return;
    
    Modal.confirm({
      title: t('orders.bulk_status_update_confirm_title'),
      content: t('orders.bulk_status_update_confirm_message', { 
        count: selectedRowKeys.length, 
        status: t(`orders.status_${status}`) 
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setBulkActionLoading(true);
          
          // Process updates in batches to avoid overwhelming the server
          const batchSize = 10;
          const batches = [];
          
          for (let i = 0; i < selectedRowKeys.length; i += batchSize) {
            batches.push(selectedRowKeys.slice(i, i + batchSize));
          }
          
          for (const batch of batches) {
            await Promise.all(batch.map(id => 
              ordersService.updateOrderStatus(id, { 
                order_status: status, 
                notes: 'Bulk status update by admin' 
              })
            ));
          }
          
          message.success(t('orders.bulk_status_updated_successfully', { 
            count: selectedRowKeys.length 
          }));
          setSelectedRowKeys([]);
          await fetchOrders();
          await fetchOrderCounts();
          updatePendingCount();
        } catch (error) {
          console.error('Bulk status update error:', error);
          message.error(error?.response?.data?.message || t('orders.bulk_status_update_error'));
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  // Enhanced Orders Export with complete data and proper Excel formatting
  const handleBulkExport = async () => {
    if (!hasSelected) {
      message.warning('Please select orders to export');
      return;
    }
    
    try {
      const selectedOrders = orders.filter(order => selectedRowKeys.includes(order.id));
      
      // Fetch complete order details including items and status history
      const ordersWithDetails = await Promise.all(
        selectedOrders.map(async (order) => {
          try {
            // Get detailed order information
            const detailResponse = await ordersService.getOrder(order.id);
            const orderDetails = detailResponse.data?.order || order;
            
            // Merge with existing order data to ensure we have all fields
            return {
              ...order,
              ...orderDetails,
              items: detailResponse.data?.items || order.items || [],
              status_history: detailResponse.data?.status_history || order.status_history || []
            };
          } catch (error) {
            console.warn(`Failed to fetch details for order ${order.id}:`, error);
            // Return the original order if details fetch fails
            return order;
          }
        })
      );

      // Use the comprehensive export utility
      await exportOrders
      ToExcel(ordersWithDetails, {
        includeItems: true,
        includeStatusHistory: true,
        filename: `FECS_Orders_Export_${selectedRowKeys.length}_Orders`,
        t: t // Pass translation function
      });

      // Clear selection after successful export
      setSelectedRowKeys([]);
      
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export orders. Please try again.');
    }
  };

  // Export all orders (filtered)
  const handleExportAll = async () => {
    try {
      if (!orders || orders.length === 0) {
        message.warning('No orders to export');
        return;
      }

      const exportConfirm = Modal.confirm({
        title: 'Export All Orders',
        content: `Are you sure you want to export all ${orders.length} orders? This may take a few moments.`,
        okText: 'Export',
        okType: 'primary',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            // Show loading message
            const loadingMessage = message.loading('Preparing export... This may take a few moments.', 0);

            // Fetch complete order details for all orders
            const ordersWithDetails = await Promise.all(
              orders.map(async (order) => {
                try {
                  const detailResponse = await ordersService.getOrder(order.id);
                  const orderDetails = detailResponse.data?.order || order;
                  
                  return {
                    ...order,
                    ...orderDetails,
                    items: detailResponse.data?.items || order.items || [],
                    status_history: detailResponse.data?.status_history || order.status_history || []
                  };
                } catch (error) {
                  console.warn(`Failed to fetch details for order ${order.id}:`, error);
                  return order;
                }
              })
            );

            // Use the comprehensive export utility
            await exportOrdersToExcel(ordersWithDetails, {
              includeItems: true,
              includeStatusHistory: true,
              filename: `FECS_All_Orders_Export_${orders.length}_Orders`,
              t: t
            });

            loadingMessage();
            
          } catch (error) {
            console.error('Export all orders error:', error);
            message.error('Failed to export all orders. Please try again.');
          }
        }
      });
      
    } catch (error) {
      console.error('Export all orders error:', error);
      message.error('Failed to export orders. Please try again.');
    }
  };

  const clearSelection = () => {
    setSelectedRowKeys([]);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      confirmed: 'blue',
      preparing: 'purple',
      ready: 'cyan',
      out_for_delivery: 'gold',
      delivered: 'green',
      cancelled: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <ClockCircleOutlined />,
      confirmed: <CheckCircleOutlined />,
      preparing: <ShoppingCartOutlined />,
      ready: <CheckCircleOutlined />,
      out_for_delivery: <TruckOutlined />,
      delivered: <CheckCircleOutlined />,
      cancelled: <CloseCircleOutlined />
    };
    return icons[status] || <ExclamationCircleOutlined />;
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const canAdvanceStatus = (status) => {
    return ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(status);
  };

  const formatPrice = (price) => {
    // Handle undefined, null, NaN, or invalid numbers
    const numPrice = Number(price);
    if (!isFinite(numPrice) || isNaN(numPrice)) {
      return '$0.00';
    }
    
    // Always format as USD currency with $ symbol
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numPrice);
  };

  const columns = [
    {
      title: 'Num',
      dataIndex: 'order_number',
      key: 'order_number',
      width: 70,
      fixed: 'left',
      ...getColumnSortProps('order_number', 'string'),
      render: (orderNumber, record) => (
        <Button
          type="link"
          style={{ 
            color: '#1890ff', 
            fontSize: '12px', 
            fontWeight: 'bold',
            padding: 0,
            height: 'auto'
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails(record);
          }}
        >
          #{record.id}
        </Button>
      )
    },
    {
      title: t('orders.orderDateTime'),
      key: 'created_at',
      dataIndex: 'created_at',
      width: 130,
      ...getColumnSortProps('created_at', 'date'),
      render: (date) => (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
            {new Date(date).toLocaleDateString()}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {new Date(date).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}
          </div>
          <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
            {(() => {
              const now = new Date();
              const orderDate = new Date(date);
              const diffMs = now - orderDate;
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHours / 24);
              
              if (diffMins < 60) return `${diffMins}m ago`;
              if (diffHours < 24) return `${diffHours}h ago`;
              return `${diffDays}d ago`;
            })()}
          </div>
        </div>
      )
    },
    {
      title: t('orders.customerName'),
      key: 'customer_name',
      dataIndex: 'customer_name',
      width: 110,
      ...getColumnSortProps('customer_name', 'string'),
      render: (name) => (
        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
          {name}
        </div>
      )
    },
    {
      title: t('orders.phoneNumber'),
      key: 'customer_phone',
      dataIndex: 'customer_phone',
      width: 110,
      render: (phone) => (
        <div style={{ fontSize: '12px' }}>
          <PhoneOutlined style={{ marginRight: 4, color: '#1890ff' }} />
          {phone}
        </div>
      )
    },
    {
      title: t('orders.email'),
      key: 'customer_email',
      dataIndex: 'customer_email',
      width: 140,
      render: (email) => email ? (
        <div style={{ fontSize: '11px' }}>
          <MailOutlined style={{ marginRight: 4, color: '#52c41a' }} />
          <Text ellipsis style={{ maxWidth: 120 }} title={email}>
            {email}
          </Text>
        </div>
      ) : (
        <Text type="secondary" style={{ fontSize: '11px' }}>No email</Text>
      )
    },
    {
      title: t('orders.location'),
      key: 'location',
      width: 160,
      render: (_, record) => {
        if (record.order_type === 'delivery' && record.delivery_address) {
          const { delivery_address } = record;
          const hasCoordinates = delivery_address.latitude && delivery_address.longitude;
          
          const handleLocationClick = () => {
            if (hasCoordinates) {
              // Open exact location in Google Maps
              const mapsUrl = `https://maps.google.com/?q=${delivery_address.latitude},${delivery_address.longitude}`;
              window.open(mapsUrl, '_blank');
            } else {
              // Fallback to address search
              const addressText = [
                delivery_address.address_line,
                delivery_address.area,
                delivery_address.city,
                delivery_address.governorate,
                'Jordan'
              ].filter(Boolean).join(', ');
              const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(addressText)}`;
              window.open(mapsUrl, '_blank');
            }
          };
          
          return (
            <div 
              style={{ 
                fontSize: '11px', 
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s',
                textDecoration: 'underline',
                textDecorationColor: '#1890ff',
                textDecorationThickness: '1px',
                color: '#1890ff'
              }}
              onClick={handleLocationClick}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f0f8ff';
                e.target.style.textDecorationThickness = '2px';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.textDecorationThickness = '1px';
              }}
              title={hasCoordinates ? 
                `Click to open exact location in maps (${delivery_address.latitude}, ${delivery_address.longitude})` : 
                'Click to search location in maps'
              }
            >
              <EnvironmentOutlined style={{ 
                marginRight: 4, 
                color: hasCoordinates ? '#52c41a' : '#fa8c16' 
              }} />
              <div style={{ fontWeight: 'bold', marginBottom: '2px', color: 'inherit' }}>
                {delivery_address.full_name || delivery_address.name}
              </div>
              <div style={{ color: 'inherit', opacity: 0.8 }}>
                {delivery_address.address_line}
              </div>
              <div style={{ color: 'inherit', opacity: 0.8 }}>
                {delivery_address.city}, {delivery_address.governorate}
              </div>
              {hasCoordinates && (
                <div style={{ fontSize: '9px', color: '#52c41a', marginTop: '2px' }}>
                  📍 GPS Available
                </div>
              )}
            </div>
          );
        } else if (record.order_type === 'pickup') {
          return (
            <div style={{ fontSize: '11px', color: '#666' }}>
              <ShoppingCartOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              <Text type="secondary">Pickup Order</Text>
            </div>
          );
        }
        return <Text type="secondary" style={{ fontSize: '11px' }}>No location</Text>;
      }
    },
    {
      title: t('orders.status'),
      dataIndex: 'order_status',
      key: 'status',
      width: 140,
      ...getColumnSortProps('order_status', 'string'),
      render: (status, record) => {
        const orderStatus = status || 'pending';
        return (
          <Dropdown
            overlay={
              <Menu onClick={({ key }) => handleQuickStatusUpdate(record, key)}>
                <Menu.Item key="pending" icon={<ClockCircleOutlined />}>
                  {t('orders.status_pending')}
                </Menu.Item>
                <Menu.Item key="confirmed" icon={<CheckCircleOutlined />}>
                  {t('orders.status_confirmed')}
                </Menu.Item>
                <Menu.Item key="preparing" icon={<ShoppingCartOutlined />}>
                  {t('orders.status_preparing')}
                </Menu.Item>
                <Menu.Item key="ready" icon={<CheckCircleOutlined />}>
                  {t('orders.status_ready')}
                </Menu.Item>
                <Menu.Item key="out_for_delivery" icon={<TruckOutlined />}>
                  {t('orders.status_out_for_delivery')}
                </Menu.Item>
                <Menu.Item key="delivered" icon={<CheckCircleOutlined />}>
                  {t('orders.status_delivered')}
                </Menu.Item>
                <Menu.Item key="cancelled" icon={<CloseCircleOutlined />} danger>
                  {t('orders.status_cancelled')}
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
            placement="bottomLeft"
          >
            <Button
              type="primary"
              size="middle"
              style={{ 
                cursor: 'pointer',
                minWidth: '120px',
                height: '36px',
                fontSize: '13px',
                backgroundColor: getStatusColor(orderStatus) === 'orange' ? '#fa8c16' :
                                getStatusColor(orderStatus) === 'blue' ? '#1890ff' :
                                getStatusColor(orderStatus) === 'purple' ? '#722ed1' :
                                getStatusColor(orderStatus) === 'cyan' ? '#13c2c2' :
                                getStatusColor(orderStatus) === 'gold' ? '#faad14' :
                                getStatusColor(orderStatus) === 'green' ? '#52c41a' :
                                getStatusColor(orderStatus) === 'red' ? '#ff4d4f' : '#d9d9d9',
                borderColor: 'transparent',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                fontWeight: '600',
                borderRadius: '6px',
                transition: 'all 0.2s ease'
              }}
              icon={getStatusIcon(orderStatus)}
              onClick={(e) => e.stopPropagation()}
            >
              {t(`orders.status_${orderStatus}`)}
            </Button>
          </Dropdown>
        );
      }
    },
    {
      title: t('orders.type'),
      dataIndex: 'order_type',
      key: 'order_type',
      width: 100,
      ...getColumnSortProps('order_type', 'string'),
      render: (type) => (
        <Tag color={type === 'delivery' ? 'blue' : 'green'} style={{ fontSize: '10px' }}>
          {type === 'delivery' ? <TruckOutlined /> : <ShoppingCartOutlined />}
          {t(`orders.${type}`)}
        </Tag>
      )
    },
    {
      title: t('orders.branch'),
      key: 'branch_info',
      width: 120,
      render: (_, record) => {
        if (record.order_type === 'pickup') {
          // Show branch name for pickup orders
          const branchName = record.branch_title_en || record.branch_title_ar || `Branch #${record.branch_id}`;
          return (
            <div style={{ fontSize: '12px' }}>
              <ShoppingCartOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              <Text strong style={{ color: '#52c41a' }}>
                {branchName}
              </Text>
            </div>
          );
        } else {
          // For delivery orders, show delivery indicator
          return (
            <div style={{ fontSize: '11px', color: '#999' }}>
              <TruckOutlined style={{ marginRight: 4 }} />
              <Text type="secondary">Delivery</Text>
            </div>
          );
        }
      }
    },
    {
      title: t('orders.itemsCount'),
      key: 'items_count',
      dataIndex: 'items_count',
      width: 80,
      align: 'center',
      render: (count) => (
        <Badge 
          count={count || 0} 
          style={{ 
            backgroundColor: '#1890ff',
            fontSize: '11px'
          }} 
          showZero
        />
      )
    },
    {
      title: t('orders.deliveryFee'),
      key: 'delivery_fee',
      dataIndex: 'delivery_fee',
      width: 100,
      align: 'right',
      ...getColumnSortProps('delivery_fee', 'currency'),
      render: (fee, record) => (
        <div>
          {record.order_type === 'delivery' ? (
            <Text style={{ fontSize: '12px', color: '#fa8c16' }}>
              {formatPrice(fee || 0)}
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: '11px' }}>Free</Text>
          )}
        </div>
      )
    },
    {
      title: t('orders.subtotal'),
      key: 'subtotal',
      dataIndex: 'subtotal',
      width: 100,
      align: 'right',
      ...getColumnSortProps('subtotal', 'currency'),
      render: (subtotal) => (
        <Text style={{ fontSize: '12px', color: '#666' }}>
          {formatPrice(subtotal)}
        </Text>
      )
    },
    {
      title: t('orders.discount'),
      key: 'discount_amount',
      dataIndex: 'discount_amount',
      width: 100,
      align: 'right',
      render: (discount) => (
        <div>
          {discount && discount > 0 ? (
            <Text style={{ fontSize: '12px', color: '#52c41a' }}>
              -{formatPrice(discount)}
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: '11px' }}>-</Text>
          )}
        </div>
      )
    },
    {
      title: t('orders.totalAmount'),
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right',
      ...getColumnSortProps('total_amount', 'currency'),
      render: (total, record) => (
        <div>
          <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
            {formatPrice(total)}
          </Text>
          <div style={{ marginTop: '4px' }}>
            <Tag 
              color={
                record.payment_method === 'cash' ? 'orange' : 
                record.payment_method === 'card' ? 'purple' : 
                record.payment_method === 'online' ? 'cyan' : 'default'
              } 
              style={{ fontSize: '9px' }}
            >
              {record.payment_method === 'cash' ? '💵' : 
               record.payment_method === 'card' ? '💳' : 
               record.payment_method === 'online' ? '🌐' : '❓'}
              {record.payment_method ? t(`orders.payment_${record.payment_method}`) : 'Unknown'}
            </Tag>
          </div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            <span style={{ 
              padding: '1px 4px', 
              borderRadius: '2px',
              backgroundColor: record.payment_status === 'paid' ? '#f6ffed' : 
                              record.payment_status === 'failed' ? '#fff1f0' : '#fff7e6',
              color: record.payment_status === 'paid' ? '#52c41a' : 
                     record.payment_status === 'failed' ? '#ff4d4f' : '#fa8c16'
            }}>
              {record.payment_status === 'paid' ? '✓' : 
               record.payment_status === 'failed' ? '✗' : '⏳'}
              {record.payment_status ? t(`orders.payment_status_${record.payment_status}`) : 'Pending'}
            </span>
          </div>
        </div>
      )
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title={t('common.view_details')}>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(record);
              }}
            />
          </Tooltip>
          
          {/* Payment Actions Dropdown */}
          <Dropdown
            overlay={
              <Menu>
                <Menu.SubMenu key="payment-method" title={t('orders.payment_method') || 'Payment Method'}>
                  <Menu.Item 
                    key="cash" 
                    onClick={() => handlePaymentMethodUpdate(record, 'cash')}
                    disabled={paymentUpdateLoading}
                  >
                    💵 {t('orders.payment_cash') || 'Cash'}
                  </Menu.Item>
                  <Menu.Item 
                    key="card" 
                    onClick={() => handlePaymentMethodUpdate(record, 'card')}
                    disabled={paymentUpdateLoading}
                  >
                    💳 {t('orders.payment_card') || 'Card'}
                  </Menu.Item>
                  <Menu.Item 
                    key="online" 
                    onClick={() => handlePaymentMethodUpdate(record, 'online')}
                    disabled={paymentUpdateLoading}
                  >
                    🌐 {t('orders.payment_online') || 'Online'}
                  </Menu.Item>
                </Menu.SubMenu>
                <Menu.SubMenu key="payment-status" title={t('orders.payment_status') || 'Payment Status'}>
                  <Menu.Item 
                    key="pending" 
                    onClick={() => handlePaymentStatusUpdate(record, 'pending')}
                    disabled={paymentUpdateLoading}
                  >
                    ⏳ {t('orders.payment_status_pending') || 'Pending'}
                  </Menu.Item>
                  <Menu.Item 
                    key="paid" 
                    onClick={() => handlePaymentStatusUpdate(record, 'paid')}
                    disabled={paymentUpdateLoading}
                  >
                    ✅ {t('orders.payment_status_paid') || 'Paid'}
                  </Menu.Item>
                  <Menu.Item 
                    key="failed" 
                    onClick={() => handlePaymentStatusUpdate(record, 'failed')}
                    disabled={paymentUpdateLoading}
                  >
                    ❌ {t('orders.payment_status_failed') || 'Failed'}
                  </Menu.Item>
                  <Menu.Item 
                    key="refunded" 
                    onClick={() => handlePaymentStatusUpdate(record, 'refunded')}
                    disabled={paymentUpdateLoading}
                  >
                    🔄 {t('orders.payment_status_refunded') || 'Refunded'}
                  </Menu.Item>
                </Menu.SubMenu>
                <Menu.Divider />
                <Menu.Item 
                  key="generate-link" 
                  icon={<CopyOutlined />}
                  onClick={() => handleGeneratePaymentLink(record)}
                  disabled={record.payment_status === 'paid' || paymentLinkLoading}
                >
                  {t('orders.generate_payment_link') || 'Generate Payment Link'}
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
            placement="bottomLeft"
            disabled={paymentUpdateLoading || paymentLinkLoading}
          >
            <Button
              type="default"
              size="small"
              icon={<DollarOutlined />}
              onClick={(e) => e.stopPropagation()}
              loading={paymentUpdateLoading || paymentLinkLoading}
              style={{ color: '#fa8c16', borderColor: '#fa8c16' }}
            >
              {t('orders.payment') || '$'}
            </Button>
          </Dropdown>

          {record.payment_status !== 'paid' && (
            <Tooltip title={t('orders.pay_with_card') || 'Pay with Card'}>
              <Button
                type="default"
                size="small"
                icon={<CreditCardOutlined />}
                loading={paymentLoadingId === record.id}
                onClick={(e) => { e.stopPropagation(); initiateCardPayment(record); }}
                style={{ color: '#722ed1', borderColor: '#722ed1' }}
              />
            </Tooltip>
          )}
          <Tooltip title={t('orders.print_invoice')}>
            <Button
              type="default"
              size="small"
              icon={<PrinterOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handlePrintInvoice(record);
              }}
              style={{ color: '#52c41a', borderColor: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button
              type="default"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                showEditModal(record);
              }}
            />
          </Tooltip>
          <Tooltip title={t('orders.cancel_order')}>
            <Button
              type="default"
              size="small"
              icon={<CloseCircleOutlined />}
              danger
              onClick={(e) => {
                e.stopPropagation();
                handleCancelOrder(record);
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <>
      <style>
        {`
          .ant-table-tbody > tr.ant-table-row:hover > td {
            background-color: #f0f9ff !important;
            transition: background-color 0.2s ease;
          }
          .ant-table-tbody > tr.ant-table-row {
            transition: background-color 0.2s ease;
          }
          .ant-table-tbody > tr.ant-table-row:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          /* Persistent notification animations */
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(255, 77, 79, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(255, 77, 79, 0);
            }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
            20%, 40%, 60%, 80% { transform: translateX(2px); }
          }
          
          .persistent-notification-urgent {
            animation: shake 0.5s ease-in-out;
          }
        `}
      </style>
      <div style={{ padding: '24px' }}>
      {/* Socket.io Connection Status */}
      <Alert
        message={
          <span>
            Socket.io Status: {' '}
            {isConnected ? (
              <span style={{ color: '#52c41a' }}>🟢 Connected</span>
            ) : (
              <span style={{ color: '#ff4d4f' }}>🔴 Disconnected</span>
            )}
          </span>
        }
        type={isConnected ? 'success' : 'warning'}
        showIcon={false}
        style={{ marginBottom: 16 }}
        closable
      />
            
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Row gutter={16} justify="end">
                  <Col>
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={showCreateModal}
                      >
                        {t('orders.add_order')}
                      </Button>
                      <Dropdown
                        overlay={
                          <Menu>
                            <Menu.Item
                              key="export-all"
                              icon={<ExportOutlined />}
                              onClick={handleExportAll}
                              disabled={!orders || orders.length === 0}
                            >
                              Export All Orders ({orders?.length || 0})
                            </Menu.Item>
                            <Menu.Item
                              key="export-selected"
                              icon={<ExportOutlined />}
                              onClick={handleBulkExport}
                              disabled={!hasSelected}
                            >
                              Export Selected ({selectedRowKeys.length})
                            </Menu.Item>
                            <Menu.Divider />
                            {/* <Menu.Item
                              key="legacy-export"
                              icon={<FileTextOutlined />}
                              disabled={!orders || orders.length === 0}
                            >
                              <ExportButton
                                {...getOrdersExportConfig(orders, columns)}
                                showFormats={['csv', 'pdf']}
                                size="small"
                                type="text"
                              />
                            </Menu.Item> */}
                          </Menu>
                        }
                        trigger={['click']}
                      >
                        <Button icon={<ExportOutlined />}>
                          Export <DownOutlined />
                        </Button>
                      </Dropdown>
                      <Dropdown
                        overlay={
                          <Menu>
                            <Menu.Item 
                              key="refresh" 
                              icon={<ReloadOutlined />}
                              onClick={() => {
                                fetchOrders();
                                refreshNotifications();
                              }}
                              disabled={loading}
                            >
                              {t('common.refresh')}
                            </Menu.Item>
                            <Menu.Item 
                              key="test-socket" 
                              icon={<ExclamationCircleOutlined />}
                              onClick={testSocketConnection}
                            >
                              Test Socket Connection
                            </Menu.Item>
                          </Menu>
                        }
                        trigger={['click']}
                      >
                        <Button
                          icon={<MoreOutlined />}
                          loading={loading}
                        >
                          {t('common.actions')}
                        </Button>
                      </Dropdown>
                      <NotificationControls />
                      <PersistentNotificationIndicator 
                        onOrderClick={(orderData) => {
                          // Find the order in the current list and show details
                          const order = orders.find(o => o.id === orderData.orderId);
                          if (order) {
                            handleViewDetails(order);
                          }
                        }}
                      />
                    </Space>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Order Insights Dashboard */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card hoverable>
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t('orders.pending_orders')}</span>
                  {(orderCounts.pending || 0) > 10 && (
                    <Tag color="warning" size="small">HIGH</Tag>
                  )}
                </div>
              }
              value={orderCounts.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ 
                color: (orderCounts.pending || 0) > 10 ? '#ff4d4f' : (orderCounts.pending || 0) > 5 ? '#fa8c16' : '#52c41a' 
              }}
              suffix={
                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                  {(orderCounts.pending || 0) > 10 
                    ? '🚨 Action needed!' 
                    : (orderCounts.pending || 0) > 5 
                    ? '⚠️ Monitor closely' 
                    : '✅ Under control'
                  }
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card hoverable>
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t('orders.todays_revenue')}</span>
                  <Tag color="success" size="small">TODAY</Tag>
                </div>
              }
              value={orderStats.today_revenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              loading={statsLoading}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                  {orderStats.today_orders || 0} orders today
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card hoverable>
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t('orders.delivery_queue')}</span>
                  <Tag color="processing" size="small">ACTIVE</Tag>
                </div>
              }
              value={orders.filter(o => ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.order_status)).length}
              prefix={<TruckOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix={
                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                  Orders in progress
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card hoverable>
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t('orders.avg_prep_time')}</span>
                  <Tag color="cyan" size="small">AVG</Tag>
                </div>
              }
              value={orderStats.avg_preparation_time || 25}
              prefix={<ClockCircleOutlined />}
              suffix={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px' }}>min</span>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
                    {(orderStats.avg_preparation_time || 25) > 30 ? '🔥 Too slow' : '⚡ Good pace'}
                  </div>
                </div>
              }
              valueStyle={{ 
                color: (orderStats.avg_preparation_time || 25) > 30 ? '#ff4d4f' : '#52c41a' 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Action Alerts */}
      {((orderCounts.pending || 0) > 10 || (orderStats.avg_preparation_time || 25) > 30) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card style={{ border: '1px solid #ff7875', backgroundColor: '#fff2f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
                <div style={{ flex: 1 }}>
                  <Text strong style={{ color: '#cf1322' }}>Action Required:</Text>
                  <div style={{ marginTop: '4px' }}>
                    {(orderCounts.pending || 0) > 10 && (
                      <Text style={{ color: '#595959', display: 'block' }}>
                        • {orderCounts.pending || 0} pending orders need immediate attention
                      </Text>
                    )}
                    {(orderStats.avg_preparation_time || 25) > 30 && (
                      <Text style={{ color: '#595959', display: 'block' }}>
                        • Average preparation time is {orderStats.avg_preparation_time || 25} minutes (target: &lt;30 min)
                      </Text>
                    )}
                  </div>
                </div>
                <Button type="primary" danger size="small" onClick={() => setFilters({ ...filters, status: 'pending' })}>
                  View Pending Orders
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={6} md={5}>
            <Input
              placeholder={t('orders.search_orders') || t('orders.search_placeholder') || 'Search orders...'}
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              allowClear
            />
          </Col>
          <Col xs={24} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('orders.filter_status')}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Option value="all">{t('common.all')}</Option>
              <Option value="pending">{t('orders.status_pending')}</Option>
              <Option value="confirmed">{t('orders.status_confirmed')}</Option>
              <Option value="preparing">{t('orders.status_preparing')}</Option>
              <Option value="ready">{t('orders.status_ready')}</Option>
              <Option value="out_for_delivery">{t('orders.status_out_for_delivery')}</Option>
              <Option value="delivered">{t('orders.status_delivered')}</Option>
              <Option value="cancelled">{t('orders.status_cancelled')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6} md={3}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('orders.filter_type')}
              value={filters.order_type}
              onChange={(value) => setFilters({ ...filters, order_type: value })}
            >
              <Option value="all">{t('common.all')}</Option>
              <Option value="delivery">{t('orders.delivery')}</Option>
              <Option value="pickup">{t('orders.pickup')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6} md={3}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('orders.filter_payment')}
              value={filters.payment_method}
              onChange={(value) => setFilters({ ...filters, payment_method: value })}
            >
              <Option value="all">{t('common.all')}</Option>
              <Option value="cash">{t('orders.payment_cash')}</Option>
              <Option value="card">{t('orders.payment_card')}</Option>
              <Option value="online">{t('orders.payment_online')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('orders.filter_date')}
              value={filters.date_range}
              onChange={(value) => {
                setFilters({ ...filters, date_range: value, custom_date_range: null });
              }}
            >
              <Option value="today">{t('orders.today')}</Option>
              <Option value="yesterday">{t('orders.yesterday')}</Option>
              <Option value="week">{t('orders.this_week')}</Option>
              <Option value="month">{t('orders.this_month')}</Option>
              <Option value="all">{t('orders.all_time')}</Option>
            </Select>
          </Col>
          {filters.date_range === 'custom' && (
            <Col xs={24} sm={12} md={5}>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                value={filters.custom_date_range}
                onChange={(dates) => setFilters({ ...filters, custom_date_range: dates })}
                placeholder={[t('orders.start_date'), t('orders.end_date')]}
                format="YYYY-MM-DD"
              />
            </Col>
          )}
        </Row>
      </Card>

      {/* Orders Table */}
      <Card>
        {/* Bulk Actions */}
        {hasSelected && (
          <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0f2f5', borderRadius: 6 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <span>{t('orders.selected_count', { count: selectedRowKeys.length })}</span>
                  <Button size="small" onClick={clearSelection}>
                    {t('common.clear_selection')}
                  </Button>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Dropdown
                    overlay={
                      <Menu onClick={({ key }) => handleBulkStatusUpdate(key)}>
                        <Menu.Item key="confirmed">{t('orders.status_confirmed')}</Menu.Item>
                        <Menu.Item key="preparing">{t('orders.status_preparing')}</Menu.Item>
                        <Menu.Item key="ready">{t('orders.status_ready')}</Menu.Item>
                        <Menu.Item key="out_for_delivery">{t('orders.status_out_for_delivery')}</Menu.Item>
                        <Menu.Item key="delivered">{t('orders.status_delivered')}</Menu.Item>
                        <Menu.Item key="cancelled" danger>{t('orders.status_cancelled')}</Menu.Item>
                      </Menu>
                    }
                    disabled={bulkActionLoading}
                  >
                    <Button loading={bulkActionLoading}>
                      {t('orders.bulk_update_status')} <DownOutlined />
                    </Button>
                  </Dropdown>
                  <Button 
                    onClick={handleBulkExport}
                    disabled={bulkActionLoading}
                    icon={<ExportOutlined />}
                  >
                    {t('common.export')}
                  </Button>
                  <Button 
                    danger
                    onClick={handleBulkDelete}
                    loading={bulkActionLoading}
                    icon={<DeleteOutlined />}
                  >
                    {t('common.delete')}
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>
        )}

        {/* User guidance */}
        <Alert
          message={
            <span>
              <EyeOutlined style={{ marginRight: 8 }} />
              {language === 'ar' 
                ? 'انقر على رقم الطلب لعرض التفاصيل، أو استخدم أزرار الإجراءات والحالة للمهام السريعة'
                : 'Click on order number to view details, or use action and status buttons for quick tasks'
              }
            </span>
          }
          type="info"
          showIcon={false}
          style={{ marginBottom: 16 }}
          closable
        />

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={sortedOrders}
          rowKey="id"
          loading={loading}
          size='small'
          scroll={{ x: 1600 }} // Increased for new columns
          onChange={() => {}} // Disable default sorting
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: sortedOrders.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} ${t('common.of')} ${total} ${t('orders.items')}`,
            onChange: (page, size) => {
              setCurrentPage(page);
              if (size !== pageSize) {
                setPageSize(size);
                setCurrentPage(1); // Reset to first page when page size changes
              }
            },
            onShowSizeChange: (current, size) => {
              setPageSize(size);
              setCurrentPage(1); // Reset to first page when page size changes
            }
          }}
        />
      </Card>

      {/* Order Details Modal */}
      <Modal
        title={`${t('orders.details')} #${selectedOrder?.order_number || selectedOrder?.id || 'N/A'}`}
        open={detailsVisible}
        onCancel={() => {
          setDetailsVisible(false);
          setDetailsLoading(false);
          setSelectedOrder(null);
        }}
        width={800}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrintInvoice(selectedOrder)} disabled={detailsLoading}>
            {t('orders.print_invoice')}
          </Button>,
          <Button 
            key="edit-status" 
            icon={<EditOutlined />} 
            onClick={() => {
              setStatusModalVisible(true);
              setSelectedOrder(selectedOrder);
              setSelectedStatus(selectedOrder?.order_status || '');
              setStatusNotes('');
            }}
            disabled={detailsLoading}
          >
            {t('orders.change_status')}
          </Button>,
          <Button 
            key="edit" 
            icon={<EditOutlined />} 
            onClick={() => {
              setDetailsVisible(false);
              showEditModal(selectedOrder);
            }}
            disabled={detailsLoading}
          >
            {t('orders.edit_order')}
          </Button>,
          <Button key="close" onClick={() => {
            setDetailsVisible(false);
            setDetailsLoading(false);
            setSelectedOrder(null);
          }}>
            {t('common.close')}
          </Button>
        ]}
      >
        {selectedOrder && (
          <div>
            {detailsLoading && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">Loading order details...</Text>
                </div>
              </div>
            )}
            
            {!detailsLoading && (
              <>
                <Descriptions bordered column={2}>
              <Descriptions.Item label={t('orders.order_number')}>
                <Text strong style={{ color: '#1890ff' }}>
                  {selectedOrder.order_number || 'N/A'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.customer_name')}>
                {selectedOrder.customer_name || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.customer_phone')}>
                <PhoneOutlined style={{ marginRight: 8 }} />
                {selectedOrder.customer_phone || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.customer_email')}>
                {selectedOrder.customer_email ? (
                  <>
                    <MailOutlined style={{ marginRight: 8 }} />
                    {selectedOrder.customer_email}
                  </>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.status')}>
                <Tag color={getStatusColor(selectedOrder.order_status)} icon={getStatusIcon(selectedOrder.order_status)}>
                  {selectedOrder.order_status ? t(`orders.status_${selectedOrder.order_status}`) : 'Unknown'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.payment_status')}>
                <Tag color={selectedOrder.payment_status === 'paid' ? 'green' : selectedOrder.payment_status === 'failed' ? 'red' : 'orange'}>
                  {selectedOrder.payment_status ? t(`orders.payment_status_${selectedOrder.payment_status}`) : 'Unknown'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.type')}>
                <Tag color={selectedOrder.order_type === 'delivery' ? 'blue' : 'green'}>
                  {selectedOrder.order_type === 'delivery' ? <TruckOutlined /> : <ShoppingCartOutlined />}
                  {selectedOrder.order_type ? t(`orders.${selectedOrder.order_type}`) : 'Unknown'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.payment_method')}>
                <Tag>{selectedOrder.payment_method ? t(`orders.payment_${selectedOrder.payment_method}`) : 'Unknown'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.branch')}>
                {selectedOrder.branch_title_en || selectedOrder.branch_title_ar || '-'}
              </Descriptions.Item>
              {selectedOrder.shipping_zone_name_en && (
                <Descriptions.Item label="Shipping Zone">
                  {selectedOrder.shipping_zone_name_en}
                  {selectedOrder.shipping_zone_name_ar && ` / ${selectedOrder.shipping_zone_name_ar}`}
                </Descriptions.Item>
              )}
              {selectedOrder.calculated_distance_km && (
                <Descriptions.Item label="Distance">
                  {parseFloat(selectedOrder.calculated_distance_km).toFixed(2)} km
                </Descriptions.Item>
              )}
              {selectedOrder.calculation_method && (
                <Descriptions.Item label="Shipping Method">
                  <Tag color="blue">{selectedOrder.calculation_method}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t('orders.created_at')}>
                {selectedOrder.created_at ? 
                  new Date(selectedOrder.created_at).toLocaleString() : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.estimated_delivery_time')}>
                {selectedOrder.estimated_delivery_time ? 
                  new Date(selectedOrder.estimated_delivery_time).toLocaleString() : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.delivered_at')}>
                {selectedOrder.delivered_at ? 
                  new Date(selectedOrder.delivered_at).toLocaleString() : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.cancelled_at')}>
                {selectedOrder.cancelled_at ? 
                  new Date(selectedOrder.cancelled_at).toLocaleString() : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.promo_code')} span={2}>
                {selectedOrder.promo_code ? 
                  <Tag color="purple">{selectedOrder.promo_code}</Tag> : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
              {selectedOrder.gift_card_id && (
                <Descriptions.Item label={t('orders.gift_card')} span={2}>
                  <Tag color="gold">Gift Card #{selectedOrder.gift_card_id}</Tag>
                </Descriptions.Item>
              )}
              {selectedOrder.special_instructions && (
                <Descriptions.Item label={t('orders.special_instructions')} span={2}>
                  <Text>{selectedOrder.special_instructions}</Text>
                </Descriptions.Item>
              )}
              {selectedOrder.cancellation_reason && (
                <Descriptions.Item label={t('orders.cancellation_reason')} span={2}>
                  <Text type="danger">{selectedOrder.cancellation_reason}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t('orders.updated_at')}>
                {selectedOrder.updated_at ? 
                  new Date(selectedOrder.updated_at).toLocaleString() : 
                  <Text type="secondary">-</Text>
                }
              </Descriptions.Item>
            </Descriptions>

            <Divider>
              <Space>
                <ShoppingCartOutlined />
                <span>{t('orders.order_items')}</span>
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <Badge count={selectedOrder.items.length} style={{ backgroundColor: '#52c41a' }} />
                )}
              </Space>
            </Divider>
            
            {selectedOrder.items && selectedOrder.items.length > 0 ? (
              <>
                {/* Items Summary */}
                <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#f8f9fa' }}>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic 
                        title="Total Items" 
                        value={selectedOrder.items.length}
                        prefix={<ShoppingCartOutlined />}
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="Total Quantity" 
                        value={selectedOrder.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="Items Subtotal" 
                        value={formatPrice(selectedOrder.items.reduce((sum, item) => sum + Number(item.total_price || 0), 0))}
                        valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      {(() => {
                        const totalDiscount = selectedOrder.items.reduce((sum, item) => {
                          const unitPrice = Number(item.unit_price || 0);
                          const quantity = Number(item.quantity || 0);
                          const totalPrice = Number(item.total_price || 0);
                          const itemDiscount = Number(item.discount_amount || 0);
                          return sum + Math.max((unitPrice * quantity) - totalPrice, itemDiscount);
                        }, 0);
                        
                        return totalDiscount > 0 ? (
                          <Statistic 
                            title="Items Discount" 
                            value={formatPrice(totalDiscount)}
                            valueStyle={{ fontSize: '16px', color: '#ff7875' }}
                            prefix="−"
                          />
                        ) : null;
                      })()}
                    </Col>
                  </Row>
                </Card>

                {/* Individual Items */}
                <div style={{ marginBottom: '16px' }}>
                  {selectedOrder.items.map((item, index) => (
                    <OrderItemCard 
                      key={item.id || index} 
                      item={item} 
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                <ShoppingCartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: '16px' }}>No items found for this order</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    This order may have been created without items or the items data is missing.
                  </Text>
                </div>
              </div>
            )}

            <Divider>{t('orders.order_summary')}</Divider>
            
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>{t('orders.subtotal')}: </Text>
                <Text>{formatPrice(selectedOrder.subtotal || 0)}</Text>
              </Col>
              <Col span={12}>
                <Text strong>{t('orders.delivery_fee')}: </Text>
                <Text>{formatPrice(selectedOrder.delivery_fee || 0)}</Text>
                {selectedOrder.free_shipping_applied && (
                  <Tag color="green" style={{ marginLeft: 8 }}>FREE SHIPPING</Tag>
                )}
              </Col>
              <Col span={12}>
                <Text strong>{t('orders.tax_amount')}: </Text>
                <Text>{formatPrice(selectedOrder.tax_amount || 0)}</Text>
              </Col>
              <Col span={12}>
                <Text strong>{t('orders.discount')}: </Text>
                <Text>{formatPrice(selectedOrder.discount_amount || 0)}</Text>
              </Col>
              {selectedOrder.points_used > 0 && (
                <Col span={12}>
                  <Text strong>{t('orders.points_used')}: </Text>
                  <Text type="warning">{selectedOrder.points_used}</Text>
                </Col>
              )}
              <Col span={12}>
                <Text strong>{t('orders.points_earned')}: </Text>
                <Text type="success">{selectedOrder.points_earned || 0}</Text>
              </Col>
              <Col span={24} style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                <Text strong style={{ fontSize: '18px' }}>{t('orders.final_total')}: </Text>
                <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                  {formatPrice(selectedOrder.total_amount || 0)}
                </Text>
              </Col>
            </Row>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Status Update Modal - Improved UI */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            {t('orders.update_status')} - Order #{selectedOrder?.order_number}
          </div>
        }
        open={statusUpdateVisible}
        onCancel={() => {
          setStatusUpdateVisible(false);
          setSelectedStatus('');
          setStatusNotes('');
        }}
        onOk={handleStatusUpdate}
        confirmLoading={statusUpdateLoading}
        okText={t('common.update')}
        cancelText={t('common.cancel')}
        width={600}
        okButtonProps={{ 
          disabled: !selectedStatus,
          size: 'large',
          icon: <CheckCircleOutlined />
        }}
        cancelButtonProps={{ size: 'large' }}
      >
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Text strong style={{ fontSize: '16px' }}>{t('orders.current_status')}: </Text>
            <Tag 
              color={getStatusColor(selectedOrder?.order_status)}
              style={{ fontSize: '14px', padding: '4px 12px' }}
              icon={getStatusIcon(selectedOrder?.order_status)}
            >
              {selectedOrder && t(`orders.status_${selectedOrder.order_status}`)}
            </Tag>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
              {t('orders.change_to')}:
            </Text>
            
            {/* Visual Status Selection Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              {[
                { value: 'pending', color: 'orange', icon: <ClockCircleOutlined /> },
                { value: 'confirmed', color: 'blue', icon: <CheckCircleOutlined /> },
                { value: 'preparing', color: 'purple', icon: <ShoppingCartOutlined /> },
                { value: 'ready', color: 'cyan', icon: <CheckCircleOutlined /> },
                { value: 'out_for_delivery', color: 'gold', icon: <TruckOutlined /> },
                { value: 'delivered', color: 'green', icon: <CheckCircleOutlined /> },
                { value: 'cancelled', color: 'red', icon: <CloseCircleOutlined /> }
              ].map(status => (
                <Card
                  key={status.value}
                  size="small"
                  hoverable
                  onClick={() => setSelectedStatus(status.value)}
                  style={{
                    cursor: 'pointer',
                    border: selectedStatus === status.value ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    backgroundColor: selectedStatus === status.value ? '#f0f8ff' : '#fff',
                    textAlign: 'center'
                  }}
                  bodyStyle={{ padding: '8px' }}
                >
                  <div style={{ marginBottom: '4px', fontSize: '16px', color: status.color === 'gold' ? '#faad14' : status.color === 'cyan' ? '#13c2c2' : status.color }}>
                    {status.icon}
                  </div>
                  <Text 
                    style={{ 
                      fontSize: '12px', 
                      fontWeight: selectedStatus === status.value ? 'bold' : 'normal',
                      color: selectedStatus === status.value ? '#1890ff' : undefined
                    }}
                  >
                    {t(`orders.status_${status.value}`)}
                  </Text>
                </Card>
              ))}
            </div>
          </div>
          
          <div>
            <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
              {t('orders.notes')} <Text type="secondary">({t('common.optional')})</Text>:
            </Text>
            <TextArea
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder={t('orders.status_notes_placeholder')}
              style={{ fontSize: '14px' }}
            />
          </div>
        </div>
      </Modal>

      {/* Create Order Modal */}
      <Modal
        title={t('orders.create_order')}
        open={createOrderVisible}
        onCancel={() => {
          setCreateOrderVisible(false);
          orderForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={orderForm}
          layout="vertical"
          onFinish={handleCreateOrder}
        >
          {/* Customer Selection - NEW */}
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="selected_customer"
                label={
                  <Space>
                    <UserOutlined />
                    {t('orders.select_customer')} 
                    <Text type="secondary">({t('orders.optional_for_notifications')})</Text>
                  </Space>
                }
              >
                <Select
                  showSearch
                  placeholder={t('orders.search_select_customer')}
                  optionFilterProp="children"
                  onSearch={fetchCustomers}
                  onChange={handleCustomerSelect}
                  onClear={() => {
                    setSelectedCustomerForOrder(null);
                    setCustomerAddresses([]);
                  }}
                  loading={customerSearchLoading}
                  allowClear
                  notFoundContent={customerSearchLoading ? <Spin size="small" /> : t('orders.no_customers_found')}
                >
                  {customers.map(customer => (
                    <Option key={customer.id} value={customer.id}>
                      <Space>
                        <UserOutlined />
                        {customer.first_name} {customer.last_name}
                        <Text type="secondary">({customer.phone})</Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              {selectedCustomerForOrder && (
                <div style={{ marginTop: '-12px', marginBottom: '16px' }}>
                  <Text type="success" style={{ fontSize: '12px' }}>
                    ✓ {t('orders.customer_selected_notification_enabled')}
                  </Text>
                </div>
              )}
            </Col>
          </Row>

          <Divider>{t('orders.customer_details')}</Divider>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="customer_name"
                label={t('orders.customer_name')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Input placeholder={t('orders.customer_name_placeholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="customer_phone"
                label={t('orders.customer_phone')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Input 
                  placeholder={t('orders.customer_phone_placeholder')} 
                  onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                />
              </Form.Item>
              
              {/* Show message when addresses are being loaded */}
              {customerAddresses.length > 0 && (
                <div style={{ marginTop: '-12px', marginBottom: '12px' }}>
                  <Text type="success" style={{ fontSize: '12px' }}>
                    ✓ Found {customerAddresses.length} saved address{customerAddresses.length !== 1 ? 'es' : ''} for this customer
                  </Text>
                </div>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="customer_email"
                label={t('orders.customer_email')}
                rules={[{ type: 'email', message: t('common.invalidEmail') }]}
              >
                <Input placeholder={t('orders.customer_email_placeholder')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="order_type"
                label={t('orders.type')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Select 
                  placeholder={t('orders.select_order_type')}
                  onChange={() => orderForm.validateFields(['delivery_address_id'])}
                >
                  <Option value="delivery">{t('orders.delivery')}</Option>
                  <Option value="pickup">{t('orders.pickup')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="payment_method"
                label={t('orders.payment_method')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Select placeholder={t('orders.select_payment_method')}>
                  <Option value="cash">{t('orders.payment_cash')}</Option>
                  <Option value="card">{t('orders.payment_card')}</Option>
                  <Option value="online">{t('orders.payment_online')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="branch_id"
                label={t('orders.branch')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <Select 
                  placeholder={t('orders.select_branch')} 
                  optionLabelProp="label"
                  onChange={async (branchId) => {
                    // Trigger shipping recalculation when branch changes
                    const addressId = orderForm.getFieldValue('delivery_address_id');
                    const subtotal = orderForm.getFieldValue('subtotal') || 0;
                    const orderType = orderForm.getFieldValue('order_type');
                    
                    if (orderType === 'delivery' && addressId && branchId) {
                      try {
                        const calculation = await calculateShippingCost(addressId, branchId, subtotal);
                        if (calculation) {
                          setShippingCalculation(calculation);
                          orderForm.setFieldsValue({
                            delivery_fee: calculation.total_shipping_cost || 0
                          });
                          message.success(`Shipping updated: ${calculation.total_shipping_cost || 0} AED`);
                        }
                      } catch (error) {
                        console.error('Error recalculating shipping:', error);
                        message.warning('Could not auto-calculate shipping for this branch');
                      }
                    }
                  }}
                >
                  {branches.map(branch => (
                    <Option 
                      key={branch.id} 
                      value={branch.id}
                      label={language === 'ar' ? branch.title_ar : branch.title_en}
                    >
                      <div style={{ 
                        whiteSpace: 'normal', 
                        wordWrap: 'break-word',
                        lineHeight: '1.4',
                        padding: '4px 0'
                      }}>
                        {language === 'ar' ? branch.title_ar : branch.title_en}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Delivery Address Row - Only for delivery orders */}
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                name="delivery_address_id"
                label={t('orders.delivery_address')}
                dependencies={['order_type']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('order_type') === 'delivery' && !value) {
                        return Promise.reject(new Error(t('orders.delivery_address_required')));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                {customerAddresses.length > 0 ? (
                  <Select 
                    placeholder={t('orders.delivery_address_placeholder')}
                    showSearch
                    optionFilterProp="children"
                    onChange={(addressId) => handleAddressChange(addressId)}
                    notFoundContent="No addresses found"
                  >
                    {customerAddresses.map(address => (
                      <Option key={address.id} value={address.id}>
                        <div>
                          <Text strong>{address.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {address.city_title_en}, {address.area_title_en}
                            {address.building_no && ` - Building ${address.building_no}`}
                            {address.is_default && <Tag color="gold" size="small" style={{ marginLeft: 4 }}>Default</Tag>}
                            {(!address.latitude || !address.longitude) && (
                              <div style={{ marginTop: '4px' }}>
                                <Tag color="orange" size="small">
                                  ⚠️ No GPS coordinates
                                </Tag>
                                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                                  Manual shipping fee required or will use default zone pricing
                                </Text>
                              </div>
                            )}
                          </Text>
                        </div>
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <Input 
                    placeholder={t('orders.delivery_address_placeholder')}
                    onChange={async (e) => {
                      const addressText = e.target.value;
                      const branchId = orderForm.getFieldValue('branch_id');
                      
                      // For manual address entry, we can't calculate shipping automatically
                      // User will need to set delivery fee manually
                      if (addressText && branchId) {
                        message.info('Please enter delivery fee manually for custom addresses');
                      }
                    }}
                  />
                )}
              </Form.Item>
              
              {/* Show instruction when customer addresses are loaded */}
              {customerAddresses.length > 0 && (
                <div style={{ marginTop: '-12px', marginBottom: '12px' }}>
                  {customerAddresses.some(addr => !addr.latitude || !addr.longitude) ? (
                    <div>
                      <Text type="warning" style={{ fontSize: '12px' }}>
                        ⚠️ Some addresses are missing GPS coordinates - default zone pricing will be used
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        For accurate shipping costs, ask customer to update addresses with precise location
                      </Text>
                    </div>
                  ) : (
                    <Text type="success" style={{ fontSize: '12px' }}>
                      ✓ All addresses have GPS coordinates - automatic shipping calculation available
                    </Text>
                  )}
                </div>
              )}
              
              {/* Show instruction when no customer addresses are found */}
              {customerAddresses.length === 0 && (
                <div style={{ marginTop: '-12px', marginBottom: '12px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    💡 Enter customer phone number to load saved addresses with automatic shipping calculation
                  </Text>
                </div>
              )}
            </Col>
          </Row>

          {/* Shipping Calculation Display */}
          {shippingCalculation && (
            <Row gutter={16}>
              <Col xs={24}>
                <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>🚚 Shipping Calculation</Text>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Text type="secondary">Zone:</Text><br />
                        <Text>{shippingCalculation.zone_name_en}</Text>
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">Distance:</Text><br />
                        <Text>{shippingCalculation.distance_km?.toFixed(2)} km</Text>
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">Cost:</Text><br />
                        <Text strong style={{ color: '#52c41a' }}>
                          {formatPrice(shippingCalculation.total_shipping_cost)}
                        </Text>
                        {shippingCalculation.free_shipping_applied && (
                          <Tag color="green" size="small" style={{ marginLeft: 4 }}>FREE</Tag>
                        )}
                      </Col>
                    </Row>
                  </Space>
                </Card>
              </Col>
            </Row>
          )}

          <Form.Item
            name="special_instructions"
            label={t('orders.special_instructions')}
          >
            <TextArea rows={3} placeholder={t('orders.special_instructions_placeholder')} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="subtotal"
                label={t('orders.subtotal')}
                rules={[{ required: true, message: t('common.required') }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="delivery_fee"
                label={t('orders.delivery_fee')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                  onChange={(value) => {
                    // Recalculate total when delivery fee changes
                    const subtotal = orderForm.getFieldValue('subtotal') || 0;
                    const pointsUsed = orderForm.getFieldValue('points_to_use') || 0;
                    const newTotal = (subtotal + (value || 0) - pointsUsed).toFixed(2);
                    
                    orderForm.setFieldsValue({
                      total_amount: parseFloat(newTotal)
                    });
                  }}
                />
              </Form.Item>
              
              {/* Shipping Calculation Display */}
              {shippingCalculation && (
                <div style={{ 
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: shippingCalculation.calculation_method === 'zone-fallback' ? '#fff7e6' : '#f6ffed',
                  border: `1px solid ${shippingCalculation.calculation_method === 'zone-fallback' ? '#ffd591' : '#b7eb8f'}`,
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  <div style={{ 
                    color: shippingCalculation.calculation_method === 'zone-fallback' ? '#d46b08' : '#52c41a', 
                    fontWeight: 'bold', 
                    marginBottom: '4px' 
                  }}>
                    {shippingCalculation.calculation_method === 'zone-fallback' ? 
                      '⚠️ Default Zone Pricing' : 
                      '📍 Auto-calculated Shipping'
                    }
                  </div>
                  <div style={{ color: '#595959' }}>
                    Zone: {shippingCalculation.zone_name} | 
                    {shippingCalculation.distance > 0 ? 
                      ` Distance: ${shippingCalculation.distance}km |` : 
                      ' Distance: Estimated |'
                    }
                    Base: {shippingCalculation.base_cost}AED
                    {shippingCalculation.free_shipping_threshold && 
                      ` | Free shipping over ${shippingCalculation.free_shipping_threshold}AED`
                    }
                  </div>
                  {shippingCalculation.calculation_method === 'zone-fallback' && (
                    <div style={{ color: '#d46b08', fontSize: '11px', marginTop: '2px' }}>
                      💡 For accurate pricing, update customer address with GPS coordinates
                    </div>
                  )}
                </div>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="points_to_use"
                label={t('orders.points_used')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="promo_code"
                label={t('orders.promo_code')}
              >
                <Input placeholder={t('orders.promo_code')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="estimated_delivery_time"
                label={t('orders.estimated_delivery_time')}
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder={t('orders.select_delivery_time')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateOrderVisible(false);
                orderForm.resetFields();
              }}>
                {t('common.cancel')}
              </Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {t('orders.create_order')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Order Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EditOutlined style={{ color: '#1890ff' }} />
            {t('orders.edit_order')} - #{editingOrder?.order_number || editingOrder?.id}
          </div>
        }
        open={editOrderVisible}
        onCancel={() => {
          setEditOrderVisible(false);
          setEditingOrder(null);
          setEditOrderItems([]);
          orderForm.resetFields();
        }}
        footer={null}
        width={900}
        styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
      >
        <Form
          form={orderForm}
          layout="vertical"
          onFinish={handleEditOrder}
        >
          {/* Customer Information */}
          <Card size="small" title={t('orders.customer_information')} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customer_name"
                  label={t('orders.customer_name')}
                  rules={[{ required: true, message: t('common.required') }]}
                >
                  <Input placeholder={t('orders.customer_name_placeholder')} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customer_phone"
                  label={t('orders.customer_phone')}
                  rules={[{ required: true, message: t('common.required') }]}
                >
                  <Input placeholder={t('orders.customer_phone_placeholder')} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="customer_email"
              label={t('orders.customer_email')}
              rules={[{ type: 'email', message: t('common.invalidEmail') }]}
            >
              <Input placeholder={t('orders.customer_email_placeholder')} />
            </Form.Item>
          </Card>

          {/* Order Details */}
          <Card size="small" title={t('orders.order_details')} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="order_type"
                  label={t('orders.type')}
                >
                  <Select 
                    placeholder={t('orders.select_order_type')}
                    onChange={(value) => {
                      // Reset delivery fee when switching to pickup
                      if (value === 'pickup') {
                        orderForm.setFieldsValue({ 
                          delivery_fee: 0,
                          delivery_address_id: null 
                        });
                        setShippingCalculation(null);
                      }
                      
                      // Validate delivery address field
                      orderForm.validateFields(['delivery_address_id']);
                      
                      // Force re-render to show/hide branch selection for pickup
                      setEditingOrder(prev => ({ ...prev, order_type: value }));
                    }}
                  >
                    <Select.Option value="pickup">{t('orders.pickup')}</Select.Option>
                    <Select.Option value="delivery">{t('orders.delivery')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              
              {/* Branch Selection - Show for pickup orders */}
              {(orderForm.getFieldValue('order_type') === 'pickup' || editingOrder?.order_type === 'pickup') && (
                <Col xs={24} md={12}>
                  <Form.Item
                    name="branch_id"
                    label={t('orders.branch')}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const orderType = getFieldValue('order_type');
                          if (orderType === 'pickup' && !value) {
                            return Promise.reject(new Error(t('orders.branch_required_for_pickup') || 'Branch is required for pickup orders'));
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <Select 
                      placeholder={t('orders.select_branch')}
                      showSearch
                      optionFilterProp="children"
                    >
                      {branches.map(branch => (
                        <Select.Option key={branch.id} value={branch.id}>
                          {branch.title_en || branch.title_ar || `Branch ${branch.id}`}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              
              {/* Delivery Address - Show only for delivery orders */}
              {(orderForm.getFieldValue('order_type') === 'delivery' || editingOrder?.order_type === 'delivery') && (
              <Col xs={24} md={12}>
                <Form.Item
                  name="delivery_address_id"
                  label={t('orders.delivery_address')}
                  dependencies={['order_type']}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const orderType = getFieldValue('order_type');
                        // Accept number IDs or non-empty strings
                        const isEmpty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
                        if (orderType === 'delivery' && isEmpty) {
                          return Promise.reject(new Error(t('orders.delivery_address_required') || 'Delivery address is required for delivery orders'));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  {customerAddresses && customerAddresses.length > 0 ? (
                    <Select 
                      placeholder={t('orders.delivery_address_placeholder')}
                      showSearch
                      optionFilterProp="children"
                      optionLabelProp="label"
                      value={orderForm.getFieldValue('delivery_address_id')}
                      onChange={async (addressIdRaw) => {
                        const addressId = String(addressIdRaw);
                        // Persist selection
                        orderForm.setFieldsValue({ delivery_address_id: addressId });
                        // Trigger shipping recalculation when address changes
                        const branchId = orderForm.getFieldValue('branch_id');
                        const subtotal = calculateOrderTotal();
                        if (orderForm.getFieldValue('order_type') === 'delivery' && addressId && branchId) {
                          try {
                            const calculation = await calculateShippingCost(addressId, branchId, subtotal);
                            if (calculation) {
                              setShippingCalculation(calculation);
                              orderForm.setFieldsValue({
                                delivery_fee: calculation.total_shipping_cost || 0
                              });
                              message.success(`Shipping updated: ${formatPrice(calculation.total_shipping_cost || 0)}`);
                            }
                          } catch (err) {
                            console.error('Edit: Error recalculating shipping:', err);
                            message.warning('Could not auto-calculate shipping for this address');
                          }
                        }
                      }}
                      notFoundContent="No addresses found"
                    >
                      {customerAddresses.map(address => {
                        // Enhanced address display logic for GPS addresses
                        const isGPSAddress = address.latitude && address.longitude && 
                                            typeof address.latitude === 'number' && 
                                            typeof address.longitude === 'number';
                        const cityArea = isGPSAddress ? 
                          `📍 GPS: ${address.latitude.toFixed(4)}, ${address.longitude.toFixed(4)}` :
                          [(address.city_title_en || address.city), (address.area_title_en || address.area)].filter(Boolean).join(', ');
                        
                        const label = [
                          (address.name || address.address_name || `Address #${address.id || address.address_id}`),
                          cityArea,
                          address.building_no && `Building ${address.building_no}`
                        ].filter(Boolean).join(' | ');
                        
                        return (
                        <Option key={String(address.id || address.address_id)} value={String(address.id || address.address_id)} label={label}>
                          <div>
                            <Text strong>{address.name || address.address_name || `Address #${address.id || address.address_id}`}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {isGPSAddress ? (
                                <span>
                                  <Tag color="green" size="small" style={{ marginRight: 4 }}>
                                    📍 GPS Address
                                  </Tag>
                                  {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
                                  {address.building_no && ` - Building ${address.building_no}`}
                                </span>
                              ) : (
                                <span>
                                  {(address.city_title_en || address.city) || 'City'}, {(address.area_title_en || address.area) || 'Area'}
                                  {address.building_no && ` - Building ${address.building_no}`}
                                </span>
                              )}
                              {address.is_default && <Tag color="gold" size="small" style={{ marginLeft: 4 }}>Default</Tag>}
                              {(!address.latitude || !address.longitude) && (
                                <div style={{ marginTop: '4px' }}>
                                  <Tag color="orange" size="small">
                                    ⚠️ No GPS coordinates
                                  </Tag>
                                  <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                                    Manual shipping fee required or will use default zone pricing
                                  </Text>
                                </div>
                              )}
                            </Text>
                          </div>
                        </Option>
                        );
                      })}
                    </Select>
                  ) : (
                    <Input.TextArea 
                      rows={3}
                      placeholder={t('orders.delivery_address_placeholder') || 'Enter delivery address or select from existing addresses'} 
                      style={{ resize: 'vertical' }}
                    />
                  )}
                </Form.Item>
                {/* Address editing button */}
                <div style={{ marginTop: '-10px', marginBottom: '16px' }}>
                  <Space size="small">
                    <Button 
                      type="dashed" 
                      size="small"
                      icon={<EnvironmentOutlined />}
                      onClick={handleEditAddress}
                      style={{ fontSize: '12px' }}
                    >
                      {editingAddress ? t('orders.edit_address_with_map') : t('orders.add_new_address_with_map')}
                    </Button>
                    {customerAddresses.length > 0 && (
                      <Button 
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={async () => {
                          const customerPhone = orderForm.getFieldValue('customer_phone');
                          if (customerPhone) {
                            await fetchCustomerAddresses(customerPhone);
                            message.success(t('orders.addresses_refreshed'));
                          }
                        }}
                        style={{ fontSize: '12px' }}
                      >
                        {t('orders.refresh_addresses') || 'Refresh'}
                      </Button>
                    )}
                  </Space>
                  {customerAddresses.length === 0 && (
                    <Text type="secondary" style={{ marginLeft: '8px', fontSize: '11px' }}>
                      {t('orders.no_saved_addresses')}
                    </Text>
                  )}
                </div>
              </Col>
              )}
            </Row>

            {/* Delivery Fee (Edit) */}
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="delivery_fee"
                  label={t('orders.delivery_fee')}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                    precision={2}
                    placeholder="0.00"
                    onChange={(value) => {
                      // Recompute total preview when delivery fee changes
                      const newTotal = (calculateOrderTotal() + (value || 0)).toFixed(2);
                      orderForm.setFieldsValue({ total_amount: parseFloat(newTotal) });
                    }}
                  />
                </Form.Item>
                {shippingCalculation && (
                  <div style={{ 
                    marginTop: '-8px',
                    padding: '8px 12px',
                    backgroundColor: shippingCalculation.calculation_method === 'zone-fallback' ? '#fff7e6' : '#f6ffed',
                    border: `1px solid ${shippingCalculation.calculation_method === 'zone-fallback' ? '#ffd591' : '#b7eb8f'}`,
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <div style={{ 
                      color: shippingCalculation.calculation_method === 'zone-fallback' ? '#d46b08' : '#52c41a', 
                      fontWeight: 'bold', 
                      marginBottom: '4px' 
                    }}>
                      {shippingCalculation.calculation_method === 'zone-fallback' ? '⚠️ Default Zone Pricing' : '📍 Auto-calculated Shipping'}
                    </div>
                    <div style={{ color: '#595959' }}>
                      Zone: {shippingCalculation.zone_name_en || shippingCalculation.zone_name} |
                      {shippingCalculation.distance_km > 0 ? ` Distance: ${shippingCalculation.distance_km}km |` : ' Distance: Estimated |'}
                      Base: {shippingCalculation.base_cost}AED
                      {shippingCalculation.free_shipping_threshold && ` | Free over ${shippingCalculation.free_shipping_threshold}AED`}
                    </div>
                  </div>
                )}
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="special_instructions"
                  label={t('orders.special_instructions')}
                >
                  <TextArea rows={3} placeholder={t('orders.special_instructions_placeholder')} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="estimated_delivery_time"
                  label={t('orders.estimated_delivery_time')}
                >
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    placeholder={t('orders.select_delivery_time')}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Order Items Management */}
          <Card 
            size="small" 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {t('orders.order_items') || 'Order Items'} ({editOrderItems.length})
                  {editOrderItems.length > 0 && (
                    <span style={{ color: '#52c41a', marginLeft: 8 }}>
                      • {t('orders.subtotal') || 'Subtotal'}: {formatPrice(calculateOrderTotal() + (parseFloat(orderForm.getFieldValue('delivery_fee')) || 0))}
                    </span>
                  )}
                </span>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<PlusOutlined />}
                  onClick={addItemToOrder}
                >
                  {t('orders.add_item') || 'Add Item'}
                </Button>
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            {editOrderItems.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                backgroundColor: '#fafafa',
                borderRadius: 8,
                border: '2px dashed #d9d9d9'
              }}>
                <ShoppingCartOutlined style={{ fontSize: 32, color: '#d9d9d9', marginBottom: 8 }} />
                <div style={{ color: '#999', marginBottom: 16 }}>
                  {t('orders.no_items_in_order') || 'No items in this order yet'}
                </div>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={addItemToOrder}
                >
                  {t('orders.add_first_item') || 'Add First Item'}
                </Button>
              </div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {editOrderItems.map((item, index) => (
                  <Card 
                    key={item.id} 
                    size="small" 
                    style={{ 
                      marginBottom: 12,
                      border: '1px solid #e8e8e8',
                      borderRadius: 8,
                      backgroundColor: item.product_id ? '#fff' : '#fff7e6'
                    }}
                    bodyStyle={{ padding: '12px 16px' }}
                  >
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
                        {t('orders.item') || 'Item'} #{index + 1}
                        {item.product_name && (
                          <span style={{ color: '#666', fontWeight: 'normal', marginLeft: 8 }}>
                            - {item.product_name}
                          </span>
                        )}
                      </Text>
                      {!item.product_id && (
                        <Tag color="orange" size="small">
                          {t('orders.incomplete_item') || 'Incomplete'}
                        </Tag>
                      )}
                    </div>
                    
                    <Row gutter={16} align="middle">
                      <Col xs={24} md={8}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: '12px', color: '#666' }}>
                            {t('orders.product') || 'Product'} *
                          </Text>
                        </div>
                        <Select
                          style={{ width: '100%' }}
                          placeholder={t('orders.select_product') || 'Select Product'}
                          value={item.product_id}
                          onChange={(value) => {
                            updateOrderItem(item.id, 'product_id', value);
                          }}
                          showSearch
                          filterOption={(input, option) => {
                            const product = products.find(p => p.id === option.value);
                            if (!product) return false;
                            const productName = language === 'ar' ? 
                              (product.title_ar || product.title_en || product.name) :
                              (product.title_en || product.title_ar || product.name);
                            return productName.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                          }}
                          allowClear
                          notFoundContent={products.length === 0 ? "Loading products..." : "No products found"}
                        >
                          {products.map(product => {
                            // Use correct backend price fields
                            const productPrice = product.final_price || product.sale_price || product.base_price || 0;
                            console.log(`Product ${product.id} display price:`, {
                              final_price: product.final_price,
                              sale_price: product.sale_price, 
                              base_price: product.base_price,
                              calculated: productPrice,
                              formatted: formatPrice(productPrice)
                            });
                            return (
                            <Option key={product.id} value={product.id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span style={{ flex: 1 }}>
                                  {language === 'ar' ? 
                                    (product.title_ar || product.title_en || product.name) :
                                    (product.title_en || product.title_ar || product.name)
                                  }
                                </span>
                                <span style={{ color: '#52c41a', fontWeight: 'bold', marginLeft: '8px' }}>
                                  {formatPrice(productPrice)}
                                </span>
                              </div>
                            </Option>
                            );
                          })}
                        </Select>
                      </Col>

                      <Col xs={12} md={4}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: '12px', color: '#666' }}>
                            {t('orders.quantity') || 'Quantity'} *
                          </Text>
                        </div>
                        <InputNumber
                          style={{ width: '100%' }}
                          min={1}
                          max={999}
                          value={item.quantity}
                          onChange={(value) => {
                            updateOrderItem(item.id, 'quantity', value || 1);
                            updateOrderItem(item.id, 'total_price', (value || 1) * item.unit_price);
                          }}
                          placeholder="1"
                        />
                      </Col>

                      <Col xs={12} md={4}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: '12px', color: '#666' }}>
                            {t('orders.unit_price') || 'Unit Price'} *
                          </Text>
                        </div>
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          step={0.01}
                          precision={2}
                          value={item.unit_price}
                          onChange={(value) => {
                            updateOrderItem(item.id, 'unit_price', value || 0);
                            updateOrderItem(item.id, 'total_price', (value || 0) * item.quantity);
                          }}
                          formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={value => value.replace(/\$\s?|(,*)/g, '')}
                          placeholder="0.00"
                        />
                      </Col>

                      <Col xs={12} md={4}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: '12px', color: '#666' }}>
                            {t('orders.item_total') || 'Item Total'}
                          </Text>
                        </div>
                        <div style={{ 
                          padding: '6px 11px',
                          backgroundColor: '#f6ffed',
                          border: '1px solid #b7eb8f',
                          borderRadius: 6,
                          textAlign: 'center',
                          minHeight: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                            {formatPrice(item.total_price || 0)}
                          </Text>
                        </div>
                      </Col>

                      <Col xs={12} md={4}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: '12px', color: '#666' }}>
                            {t('common.actions') || 'Actions'}
                          </Text>
                        </div>
                        <Space size="small">
                          <Tooltip title={t('orders.duplicate_item') || 'Duplicate Item'}>
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => {
                                const duplicatedItem = {
                                  ...item,
                                  id: Date.now() + Math.random()
                                };
                                setEditOrderItems([...editOrderItems, duplicatedItem]);
                                message.success(t('orders.item_duplicated') || 'Item duplicated successfully');
                              }}
                              style={{ 
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px'
                              }}
                            />
                          </Tooltip>
                          <Tooltip title={t('orders.remove_item') || 'Remove Item'}>
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                Modal.confirm({
                                  title: t('orders.confirm_remove_item') || 'Remove Item',
                                  content: t('orders.confirm_remove_item_message') || 'Are you sure you want to remove this item from the order?',
                                  okText: t('common.remove') || 'Remove',
                                  cancelText: t('common.cancel') || 'Cancel',
                                  okType: 'danger',
                                  onOk: () => {
                                    removeItemFromOrder(item.id);
                                    message.success(t('orders.item_removed') || 'Item removed successfully');
                                  }
                                });
                              }}
                              style={{ 
                                border: '1px solid #ff4d4f',
                                borderRadius: '4px'
                              }}
                            />
                          </Tooltip>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
            )}

            {/* Order Summary */}
            {editOrderItems.length > 0 && (
              <Card 
                size="small" 
                style={{ 
                  marginTop: 16,
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef'
                }}
              >
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space direction="vertical" size="small">
                      <div>
                        <Text strong>{t('orders.total_items') || 'Total Items'}: </Text>
                        <Tag color="blue">{editOrderItems.length} {t('orders.items') || 'items'}</Tag>
                      </div>
                      <div>
                        <Text strong>{t('orders.total_quantity') || 'Total Quantity'}: </Text>
                        <Tag color="green">
                          {editOrderItems.reduce((total, item) => total + Number(item.quantity || 0), 0)} {t('orders.pieces') || 'pieces'}
                        </Tag>
                      </div>
                    </Space>
                  </Col>
                  <Col>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: '14px', color: '#666' }}>
                          {t('orders.items_subtotal') || 'Items Subtotal'}:
                        </Text>
                      </div>
                      <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                        {formatPrice(calculateOrderTotal() + (parseFloat(orderForm.getFieldValue('delivery_fee')) || 0))}
                      </Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}
          </Card>

          {/* Form Actions */}
          <Card size="small">
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Button 
                    onClick={() => {
                      setEditOrderVisible(false);
                      setEditingOrder(null);
                      setEditOrderItems([]);
                      orderForm.resetFields();
                    }}
                    icon={<CloseCircleOutlined />}
                  >
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                  <Button 
                    type="default"
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: t('orders.reset_items_confirm') || 'Reset Items',
                        content: t('orders.reset_items_message') || 'Are you sure you want to reset all items to their original state? This will undo all changes made to the items.',
                        okText: t('common.reset') || 'Reset',
                        cancelText: t('common.cancel') || 'Cancel',
                        okType: 'danger',
                        onOk: () => {
                          // Reset items to original state
                          if (editingOrder && editingOrder.items) {
                            const orderItems = editingOrder.items.map(item => ({
                              id: item.id || Date.now() + Math.random(),
                              product_id: item.product_id,
                              product_name: item.product_name || item.product_title_en || item.product_title_ar || 'Unknown Product',
                              quantity: Number(item.quantity || 1),
                              unit_price: Number(item.unit_price || item.price || 0),
                              total_price: Number(item.total_price || (item.unit_price || item.price || 0) * (item.quantity || 1))
                            }));
                            setEditOrderItems(orderItems);
                            message.success(t('orders.items_reset_success') || 'Items have been reset to original state');
                          } else {
                            setEditOrderItems([]);
                            message.success(t('orders.items_cleared_success') || 'All items have been cleared');
                          }
                        }
                      });
                    }}
                  >
                    {t('orders.reset_items') || 'Reset Items'}
                  </Button>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    disabled={editOrderItems.length === 0}
                    loading={loading}
                  >
                    {t('orders.update_order') || 'Update Order'}
                  </Button>
                </Space>
              </Col>
            </Row>
            
            {editOrderItems.length === 0 && (
              <div style={{ 
                marginTop: 12, 
                padding: '8px 12px', 
                backgroundColor: '#fff7e6', 
                border: '1px solid #ffd591',
                borderRadius: 4,
                fontSize: '12px',
                color: '#d46b08'
              }}>
                <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                {t('orders.no_items_warning') || 'Warning: Orders must have at least one item. Please add items before updating.'}
              </div>
            )}
          </Card>
        </Form>
      </Modal>

      {/* Address Editing Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined style={{ color: '#1890ff' }} />
            {editingAddress ? t('orders.edit_address') : t('orders.add_new_address')}
          </div>
        }
        open={showAddressEditor}
        onCancel={handleCancelAddressEdit}
        footer={null}
        width={800}
        styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
      >
        <EnhancedAddressForm
          form={addressForm}
          onFinish={handleAddressFormFinish}
          cities={cities}
          areas={areas}
          streets={streets}
          onCityChange={handleCityChange}
          onAreaChange={handleAreaChange}
          isEditing={!!editingAddress}
          t={t}
          initialCoordinates={editingAddress ? {
            lat: editingAddress.latitude,
            lng: editingAddress.longitude
          } : null}
          showMapFirst={true}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancelAddressEdit}>
              {t('common.cancel')}
            </Button>
            <Button 
              type="primary" 
              onClick={() => addressForm.submit()}
              icon={<SaveOutlined />}
            >
              {editingAddress ? t('orders.update_address') : t('orders.save_address')}
            </Button>
          </Space>
        </div>
      </Modal>

      {/* Create Order Modal */}
      <CreateOrderModal
        visible={createOrderVisible}
        onCancel={() => setCreateOrderVisible(false)}
        onSuccess={() => {
          fetchOrders();
          refreshNotifications();
        }}
        t={t}
      />

      {/* Payment Link Modal */}
      <Modal
        title={t('orders.payment_link') || 'Payment Link'}
        open={paymentLinkVisible}
        onCancel={() => {
          setPaymentLinkVisible(false);
          setGeneratedPaymentLink('');
        }}
        width={600}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyPaymentLink}>
            {t('orders.copy_link') || 'Copy Link'}
          </Button>,
          <Button key="close" onClick={() => {
            setPaymentLinkVisible(false);
            setGeneratedPaymentLink('');
          }}>
            {t('common.close') || 'Close'}
          </Button>
        ]}
      >
        <div style={{ padding: '16px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: '12px' }}>
            {t('orders.payment_link_instruction') || 'Share this link with the customer to complete payment:'}
          </Text>
          
          <Input.TextArea
            value={generatedPaymentLink}
            readOnly
            rows={3}
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '12px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #d9d9d9'
            }}
          />
          
          <Alert
            message={t('orders.payment_link_note') || 'Note: This link is valid until the order is paid or cancelled.'}
            type="info"
            style={{ marginTop: '12px' }}
            showIcon
          />
        </div>
      </Modal>
    </div>
    </>
  );
};

// Shipping Calculation Display Component
const ShippingCalculationDisplay = ({ shippingCalculation, loading = false, formatPrice }) => {
  // Fallback formatPrice function if not provided
  const defaultFormatPrice = (price) => {
    const numPrice = Number(price);
    if (!isFinite(numPrice) || isNaN(numPrice)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numPrice);
  };

  const priceFormatter = formatPrice || defaultFormatPrice;
  if (loading) {
    return (
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#f6f6f6', 
        borderRadius: '6px', 
        border: '1px solid #d9d9d9',
        marginTop: '8px'
      }}>
        <Spin size="small" />
        <span style={{ marginLeft: '8px', fontSize: '13px', color: '#666' }}>
          Calculating shipping cost...
        </span>
      </div>
    );
  }

  if (!shippingCalculation) return null;

  const { 
    delivery_fee, 
    free_shipping_applied, 
    shipping_zone_name, 
    distance_km, 
    calculation_method 
  } = shippingCalculation;

  return (
    <div style={{ 
      padding: '12px', 
      backgroundColor: free_shipping_applied ? '#f6ffed' : '#e6f7ff', 
      borderRadius: '6px', 
      border: `1px solid ${free_shipping_applied ? '#b7eb8f' : '#91d5ff'}`,
      marginTop: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <Text strong style={{ color: free_shipping_applied ? '#52c41a' : '#1890ff', fontSize: '14px' }}>
          🚚 Shipping: {priceFormatter(delivery_fee)}
          {free_shipping_applied && (
            <Tag color="green" size="small" style={{ marginLeft: '8px' }}>
              FREE SHIPPING!
            </Tag>
          )}
        </Text>
      </div>
      
      <div style={{ fontSize: '12px', color: '#666' }}>
        <div>📍 Zone: {shipping_zone_name}</div>
        {distance_km && (
          <div>📏 Distance: {distance_km.toFixed(1)} km</div>
        )}
        {calculation_method && (
          <div>⚙️ Method: {calculation_method}</div>
        )}
      </div>
    </div>
  );
};

export default Orders;
