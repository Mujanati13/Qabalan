import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Table,
  Tag,
  Alert,
  Spin,
  DatePicker,
  Select,
  Button,
  Dropdown,
  message,
  Modal,
  Tooltip,
} from "antd";
import {
  ShoppingCartOutlined,
  UserOutlined,
  DollarCircleOutlined,
  ShopOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  ReloadOutlined,
  WarningOutlined,
  BellOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  EyeOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";
import { Line, Column, Pie } from "@ant-design/charts";
import { useLanguage } from "../contexts/LanguageContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../hooks/useAuth";
import { useFormatters } from "../utils/formatters";
import dashboardService from "../services/dashboardService";
import ordersService from "../services/ordersService";
import productsService from "../services/productsService";
import QuickNotificationFAB from "../components/common/QuickNotificationFAB";
import NotificationsDashboardWidget from "../components/notifications/NotificationsDashboardWidget";
import NotificationQuickActions from "../components/notifications/NotificationQuickActions";
import api from "../services/api";
import dayjs from "dayjs";
import * as ExcelJS from 'exceljs';
import { debounce } from 'lodash';
import io from 'socket.io-client';
import { exportOrdersToExcel, exportDashboardToExcel } from '../utils/comprehensiveExportUtils';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const DashboardContent = () => {
  const { currentLanguage } = useLanguage();
  const { user } = useAuth();
  const { 
    pendingOrdersCount, 
    updatePendingCount, 
    refreshNotifications,
    triggerNewOrderNotifications
  } = useNotifications();
  const {
    formatCurrency,
    formatNumber,
    formatDate,
    formatPercentage,
    formatCompactNumber,
  } = useFormatters();

  // Socket connection
  const socketRef = useRef(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  // Order details modal
  const [orderDetailsVisible, setOrderDetailsVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);

  // Local translations
  const translations = {
    en: {
      dashboard: {
        title: "Dashboard",
        subtitle: "Overview of your business performance",
        loading: "Loading...",
        refresh: "Refresh",
        export: "Export",
        exportExcel: "Export to Excel",
        exportPDF: "Export to PDF",
        exportSuccess: "Export completed successfully",
        exportError: "Export failed",
        exportCompleteDashboard: "Complete Dashboard Analytics",
        exportRecentOrders: "Export Recent Orders",
        exportHotOrders: "Export Hot Orders",
        clear: "Clear",
        clearFilters: "Clear Filters",
        viewAll: "View All",
        noData: "No data available",
        noAlerts: "No alerts at this time",
        
        // Time periods
        today: "Today",
        thisWeek: "This Week",
        thisMonth: "This Month",
        thisYear: "This Year",
        customRange: "Custom Range",
        startDate: "Start Date",
        endDate: "End Date",
        date: "Date",
        period: "Period",
        weekday: "Weekday",
        reportGenerated: "Report Generated",
        reportPeriod: "Report Period",
        
        // Statistics
        totalOrders: "Total Orders",
        totalRevenue: "Total Revenue",
        totalCustomers: "Total Customers",
        averageOrder: "Average Order Value",
        growth: "Growth",
        
        // Hot Orders
        hotOrders: "Hot Orders",
        needsAction: "Need Action",
        requiresAttention: "Requires Immediate Attention",
        priorityOrders: "Priority Orders",
        urgent: "Urgent",
        high: "High Priority",
        medium: "Medium Priority",
        ready: "Ready for Delivery",
        
        // Charts and Analytics
        orderFlow: "Order Flow",
        salesRevenue: "Sales Revenue",
        orderStatusDistribution: "Order Status Distribution",
        trendsAnalysis: "Trends Analysis",
        executiveSummary: "Executive Summary",
        
        // Table Headers
        orderId: "Order ID",
        customer: "Customer",
        amount: "Amount",
        status: "Status",
        priority: "Priority",
        product: "Product",
        sold: "Units Sold",
        revenue: "Revenue",
        rank: "Rank",
        orders: "Orders",
        trend: "Trend",
        performance: "Performance",
        
        // Status translations
        status_pending: "Pending",
        status_confirmed: "Confirmed",
        status_preparing: "Preparing",
        status_ready: "Ready",
        status_out_for_delivery: "Out for Delivery",
        status_delivered: "Delivered",
        status_cancelled: "Cancelled",
        
        // Performance levels
        excellent: "Excellent",
        good: "Good",
        growing: "Growing",
        
        // Trends
        increasing: "Increasing",
        decreasing: "Decreasing",
        stable: "Stable",
        
        // Shipping Analytics
        shippingAnalytics: "Shipping Analytics",
        avgDistance: "Average Distance",
        avgShippingCost: "Average Shipping Cost",
        freeShippingRate: "Free Shipping Rate",
        totalCalculations: "Total Calculations",
        popularZones: "Popular Zones",
        ordersText: "orders",
        
        // Inventory
        inventoryAlerts: "Inventory Alerts",
        recentNotifications: "Recent Notifications",
        supportTickets: "Support Tickets",
        newTicket: "New Support Ticket",
        urgentTicket: "Urgent Ticket",
        highPriorityTicket: "High Priority Ticket",
        ticketAssigned: "Ticket Assigned",
        noNotifications: "No recent notifications",
        stock: "Stock",
        stock_out_of_stock: "Out of Stock",
        stock_limited: "Limited Stock",
        stock_in_stock: "In Stock",
        
        // Products
        recentOrders: "Recent Orders",
        topProducts: "Top Products",
        bestSellers: "Best Sellers",
        
        // Report
        reportFooter: "Generated by FECS Admin Dashboard",
        allRightsReserved: "All rights reserved",
        
        // Order actions
        actions: "Actions",
        orderId: "Order ID",
        customer: "Customer",
        amount: "Amount", 
        status: "Status",
        date: "Date",
        
        // Order statuses
        status_pending: "Pending",
        status_confirmed: "Confirmed", 
        status_preparing: "Preparing",
        status_ready: "Ready",
        status_out_for_delivery: "Out for Delivery",
        status_delivered: "Delivered",
        status_cancelled: "Cancelled"
      },
      common: {
        loading: "Loading...",
        refresh: "Refresh"
      }
    },
    ar: {
      dashboard: {
        title: "لوحة التحكم",
        subtitle: "نظرة عامة على أداء عملك",
        loading: "جاري التحميل...",
        refresh: "تحديث",
        export: "تصدير",
        exportExcel: "تصدير إلى Excel",
        exportPDF: "تصدير إلى PDF",
        exportSuccess: "تم التصدير بنجاح",
        exportError: "فشل التصدير",
        exportCompleteDashboard: "تحليلات لوحة التحكم الكاملة",
        exportRecentOrders: "تصدير الطلبات الأخيرة",
        exportHotOrders: "تصدير الطلبات العاجلة",
        clear: "مسح",
        clearFilters: "مسح المرشحات",
        viewAll: "عرض الكل",
        noData: "لا توجد بيانات متاحة",
        noAlerts: "لا توجد تنبيهات في الوقت الحالي",
        
        // Time periods
        today: "اليوم",
        thisWeek: "هذا الأسبوع",
        thisMonth: "هذا الشهر",
        thisYear: "هذا العام",
        customRange: "نطاق مخصص",
        startDate: "تاريخ البداية",
        endDate: "تاريخ النهاية",
        date: "التاريخ",
        period: "الفترة",
        weekday: "يوم الأسبوع",
        reportGenerated: "تم إنشاء التقرير",
        reportPeriod: "فترة التقرير",
        
        // Statistics
        totalOrders: "إجمالي الطلبات",
        totalRevenue: "إجمالي الإيرادات",
        totalCustomers: "إجمالي العملاء",
        averageOrder: "متوسط قيمة الطلب",
        growth: "النمو",
        
        // Hot Orders
        hotOrders: "الطلبات العاجلة",
        needsAction: "تحتاج إجراء",
        requiresAttention: "يتطلب اهتمام فوري",
        priorityOrders: "الطلبات ذات الأولوية",
        urgent: "عاجل",
        high: "أولوية عالية",
        medium: "أولوية متوسطة",
        ready: "جاهز للتسليم",
        
        // Charts and Analytics
        orderFlow: "تدفق الطلبات",
        salesRevenue: "إيرادات المبيعات",
        orderStatusDistribution: "توزيع حالة الطلبات",
        trendsAnalysis: "تحليل الاتجاهات",
        executiveSummary: "الملخص التنفيذي",
        
        // Table Headers
        orderId: "رقم الطلب",
        customer: "العميل",
        amount: "المبلغ",
        status: "الحالة",
        priority: "الأولوية",
        product: "المنتج",
        sold: "الوحدات المباعة",
        revenue: "الإيرادات",
        rank: "التصنيف",
        orders: "الطلبات",
        trend: "الاتجاه",
        performance: "الأداء",
        
        // Status translations
        status_pending: "في الانتظار",
        status_confirmed: "مؤكد",
        status_preparing: "قيد التحضير",
        status_ready: "جاهز",
        status_out_for_delivery: "في الطريق للتسليم",
        status_delivered: "تم التسليم",
        status_cancelled: "ملغى",
        
        // Performance levels
        excellent: "ممتاز",
        good: "جيد",
        growing: "في نمو",
        
        // Trends
        increasing: "متزايد",
        decreasing: "متناقص",
        stable: "مستقر",
        
        // Shipping Analytics
        shippingAnalytics: "تحليلات الشحن",
        avgDistance: "متوسط المسافة",
        avgShippingCost: "متوسط تكلفة الشحن",
        freeShippingRate: "معدل الشحن المجاني",
        totalCalculations: "إجمالي الحسابات",
        popularZones: "المناطق الشائعة",
        ordersText: "طلبات",
        
        // Inventory
        inventoryAlerts: "تنبيهات المخزون",
        recentNotifications: "الإشعارات الحديثة",
        supportTickets: "تذاكر الدعم",
        newTicket: "تذكرة دعم جديدة",
        urgentTicket: "تذكرة عاجلة",
        highPriorityTicket: "تذكرة ذات أولوية عالية",
        ticketAssigned: "تم تعيين التذكرة",
        noNotifications: "لا توجد إشعارات حديثة",
        stock: "المخزون",
        stock_out_of_stock: "نفدت الكمية",
        stock_limited: "كمية محدودة",
        stock_in_stock: "متوفر",
        
        // Products
        recentOrders: "الطلبات الأخيرة",
        topProducts: "أفضل المنتجات",
        bestSellers: "الأكثر مبيعاً",
        
        // Report
        reportFooter: "تم إنشاؤه بواسطة لوحة تحكم FECS",
        allRightsReserved: "جميع الحقوق محفوظة",
        
        // Order actions
        actions: "الإجراءات",
        orderId: "رقم الطلب",
        customer: "العميل",
        amount: "المبلغ",
        status: "الحالة", 
        date: "التاريخ",
        
        // Order statuses
        status_pending: "قيد الانتظار",
        status_confirmed: "مؤكد",
        status_preparing: "قيد التحضير", 
        status_ready: "جاهز",
        status_out_for_delivery: "في الطريق",
        status_delivered: "تم التسليم",
        status_cancelled: "ملغي"
      },
      common: {
        loading: "جاري التحميل...",
        refresh: "تحديث"
      }
    }
  };

  // Get translation function for current language
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[currentLanguage || 'en'];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [period, setPeriod] = useState("week");
  const [dateRange, setDateRange] = useState(null);
  const [stats, setStats] = useState({});
  const [orderFlow, setOrderFlow] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [hotOrders, setHotOrders] = useState([]);
  const [customerStats, setCustomerStats] = useState({});
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [shippingAnalytics, setShippingAnalytics] = useState(null);
  const [newOrderAnimation, setNewOrderAnimation] = useState(null);
  
  // Global product toggle state
  const [globalToggleLoading, setGlobalToggleLoading] = useState(false);

  // Audio for notifications
  const audioRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    // Try to load the notification sound file
    audioRef.current = new Audio('/notification-sound.mp3');
    audioRef.current.volume = 1;
    audioRef.current.preload = 'auto';
    
    // Fallback: Create a synthetic notification sound using Web Audio API
    const createNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        return () => {
          // Create oscillators for a pleasant notification sound
          const oscillator1 = audioContext.createOscillator();
          const oscillator2 = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator1.connect(gainNode);
          oscillator2.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Create a pleasant two-tone notification sound
          oscillator1.frequency.value = 800; // Higher tone
          oscillator2.frequency.value = 600; // Lower tone
          oscillator1.type = 'sine';
          oscillator2.type = 'sine';
          
          // Create envelope for smooth sound
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator1.start(audioContext.currentTime);
          oscillator1.stop(audioContext.currentTime + 0.2);
          
          oscillator2.start(audioContext.currentTime + 0.1);
          oscillator2.stop(audioContext.currentTime + 0.5);
        };
      } catch (error) {
        console.warn('Web Audio API not available:', error);
        return () => {}; // Silent fallback
      }
    };
    
    // Set up fallback if file fails to load
    audioRef.current.onerror = () => {
      console.log('Using synthetic notification sound');
      audioRef.current = { play: createNotificationSound() };
    };
    
    // Test if the audio file exists by trying to play it silently
    audioRef.current.load();
  }, []);

  const playNotificationSound = () => {
    try {
      if (audioRef.current && audioRef.current.play) {
        audioRef.current.play().catch(console.warn);
      }
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadShippingAnalytics();
  }, [dateRange]); // Only reload when date range changes

  useEffect(() => {
    loadOrderFlow();
    loadSalesData();
  }, [period, dateRange]); // Only reload when period or date range changes

  // Socket connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3015';
    
    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      timeout: 30000,
      forceNew: true
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Dashboard connected to socket');
      setIsSocketConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Dashboard disconnected from socket');
      setIsSocketConnected(false);
    });

    // Listen for new orders
    socketRef.current.on('newOrderCreated', (orderData) => {
      console.log('🛒 New order received in Dashboard:', orderData);
      
      // Play notification sound
      playNotificationSound();
      
      // Show success message with order details
      message.success({
        content: `🔥 New Order Received! Order #${orderData.order_number || orderData.id} - ${orderData.customer_name || 'Customer'}`,
        duration: 5,
        style: {
          marginTop: '20vh',
          fontSize: '16px',
          fontWeight: 'bold',
        }
      });
      
      // Add new order to hot orders with animation
      const newOrder = {
        ...orderData,
        id: orderData.id,
        order_number: orderData.order_number || `#${orderData.id}`,
        customer_name: orderData.customer_name || 'New Customer',
        total_amount: orderData.total_amount || 0,
        order_status: orderData.order_status || 'pending',
        created_at: orderData.created_at || new Date().toISOString()
      };
      
      // Add to hot orders if it needs action
      const actionableStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
      if (actionableStatuses.includes(newOrder.order_status)) {
        setHotOrders(prevHotOrders => {
          const exists = prevHotOrders.find(order => order.id === newOrder.id);
          if (!exists) {
            return [newOrder, ...prevHotOrders];
          }
          return prevHotOrders;
        });
        
        // Trigger animation
        setNewOrderAnimation(newOrder.id);
        setTimeout(() => setNewOrderAnimation(null), 3000);
      }
      
      // Add to recent orders
      setRecentOrders(prevRecentOrders => {
        const exists = prevRecentOrders.find(order => order.id === newOrder.id);
        if (!exists) {
          return [newOrder, ...prevRecentOrders.slice(0, 9)]; // Keep only 10 recent orders
        }
        return prevRecentOrders;
      });
      
      // Update stats (increment total orders)
      setStats(prevStats => ({
        ...prevStats,
        totalOrders: (prevStats.totalOrders || 0) + 1,
        pendingOrders: (prevStats.pendingOrders || 0) + (newOrder.order_status === 'pending' ? 1 : 0)
      }));
      
      // Update notifications
      updatePendingCount();
    });

    // Listen for order status updates
    socketRef.current.on('orderStatusUpdated', (orderData) => {
      console.log('📦 Order status updated in Dashboard:', orderData);
      
      // Only refresh if the order affects hot orders or stats
      const affectsHotOrders = ['pending', 'confirmed', 'preparing', 'ready', 'cancelled'].includes(orderData.new_status);
      if (affectsHotOrders) {
        refreshDashboardOrders();
      }
    });

    // Listen for order count updates
    socketRef.current.on('orderCountsUpdated', (data) => {
      console.log('📊 Order counts updated in Dashboard:', data);
      
      // Just update pending count without full refresh
      updatePendingCount(data.pendingOrders);
    });

    // Listen for new support tickets
    socketRef.current.on('newSupportTicket', (ticketData) => {
      console.log('🎫 New support ticket created:', ticketData);
      
      // Play notification sound
      if (audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Could not play audio:', error);
            playNotificationSound();
          });
        }
      } else {
        playNotificationSound();
      }

      // Add to recent notifications
      const newNotification = {
        id: `ticket-${ticketData.id}`,
        type: ticketData.priority === 'urgent' ? 'error' : ticketData.priority === 'high' ? 'warning' : 'info',
        title: ticketData.priority === 'urgent' ? t('dashboard.urgentTicket') : 
               ticketData.priority === 'high' ? t('dashboard.highPriorityTicket') : 
               t('dashboard.newTicket'),
        message: `#${ticketData.ticket_number}: ${ticketData.subject}`,
        timestamp: ticketData.created_at,
        category: 'support',
        priority: ticketData.priority,
        ticketId: ticketData.id
      };

      setRecentNotifications(prev => [newNotification, ...prev.slice(0, 4)]);

      // Show message notification
      message.info(`New support ticket: #${ticketData.ticket_number}`);
    });

    // Listen for support ticket updates
    socketRef.current.on('supportTicketUpdated', (ticketData) => {
      console.log('🎫 Support ticket updated:', ticketData);
      
      // Refresh notifications to get latest data
      fetchRecentNotifications().then(notifications => {
        setRecentNotifications(notifications);
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [updatePendingCount]);

  // Fetch recent notifications including support tickets
  const fetchRecentNotifications = async () => {
    try {
      const notifications = [];
      
      // Fetch recent support tickets
      const supportResponse = await api.get('/api/support/admin/tickets', {
        params: { 
          limit: 10,
          sortBy: 'created_at',
          sortOrder: 'desc',
          status: 'open,in_progress' // Only show active tickets
        }
      });
      
      if (supportResponse.data?.data?.tickets) {
        supportResponse.data.data.tickets.forEach(ticket => {
          const createdAt = new Date(ticket.created_at);
          const now = new Date();
          const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
          
          // Only show notifications from last 24 hours
          if (hoursDiff <= 24) {
            let type = 'info';
            let title = t('dashboard.newTicket');
            
            if (ticket.priority === 'urgent') {
              type = 'error';
              title = t('dashboard.urgentTicket');
            } else if (ticket.priority === 'high') {
              type = 'warning';
              title = t('dashboard.highPriorityTicket');
            }
            
            notifications.push({
              id: `ticket-${ticket.id}`,
              type: type,
              title: title,
              message: `#${ticket.ticket_number}: ${ticket.subject}`,
              timestamp: ticket.created_at,
              category: 'support',
              priority: ticket.priority,
              ticketId: ticket.id
            });
          }
        });
      }
      
      // Sort by timestamp (newest first)
      notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return notifications.slice(0, 5); // Limit to 5 most recent
    } catch (error) {
      console.error('Error fetching recent notifications:', error);
      return [];
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Prepare date range parameters
      const dateParams =
        dateRange && dateRange.length === 2
          ? {
              startDate: dateRange[0].format("YYYY-MM-DD"),
              endDate: dateRange[1].format("YYYY-MM-DD"),
            }
          : {};

      const [
        statsResponse,
        topProductsResponse,
        recentOrdersResponse,
        customerStatsResponse,
        inventoryAlertsResponse,
        recentNotificationsResponse,
      ] = await Promise.all([
        dashboardService.getDashboardStats(dateParams),
        dashboardService.getTopProducts(10, dateParams),
        dashboardService.getRecentOrders(10, dateParams),
        dashboardService.getCustomerStats(dateParams),
        dashboardService.getInventoryAlerts(),
        fetchRecentNotifications(),
      ]);

      setStats(statsResponse.data);
      setTopProducts(topProductsResponse.data);
      setRecentOrders(recentOrdersResponse.data);
      
      // Filter hot orders that need action (pending, confirmed, preparing)
      const actionableStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
      const filteredHotOrders = recentOrdersResponse.data.filter(order => 
        actionableStatuses.includes(order.order_status)
      );
      setHotOrders(filteredHotOrders);
      
      setCustomerStats(customerStatsResponse.data);
      setInventoryAlerts(inventoryAlertsResponse.data);
      setRecentNotifications(recentNotificationsResponse);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderFlow = async () => {
    try {
      const params =
        dateRange && dateRange.length === 2
          ? {
              period,
              startDate: dateRange[0].format("YYYY-MM-DD"),
              endDate: dateRange[1].format("YYYY-MM-DD"),
            }
          : { period };

      const response = await dashboardService.getOrderFlow(params);
      setOrderFlow(response.data);
    } catch (error) {
      console.error("Error loading order flow:", error);
    }
  };

  const loadSalesData = async () => {
    try {
      const params =
        dateRange && dateRange.length === 2
          ? {
              period,
              startDate: dateRange[0].format("YYYY-MM-DD"),
              endDate: dateRange[1].format("YYYY-MM-DD"),
            }
          : { period };

      const response = await dashboardService.getSalesData(params);
      setSalesData(response.data);
    } catch (error) {
      console.error("Error loading sales data:", error);
    }
  };

  const loadShippingAnalytics = async () => {
    try {
      const response = await api.get("/shipping/analytics");
      setShippingAnalytics(response.data.data);
    } catch (error) {
      console.error("Error loading shipping analytics:", error);
    }
  };

  const refreshData = async () => {
    setStatsLoading(true);
    try {
      await Promise.all([
        loadDashboardData(),
        loadOrderFlow(),
        loadSalesData()
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      message.error('Failed to refresh dashboard data');
    } finally {
      setStatsLoading(false);
    }
  };

  // Debounced refresh to prevent multiple rapid calls
  const debouncedRefresh = useCallback(
    debounce(refreshData, 1000),
    [dateRange, period]
  );

  // Add throttling to prevent excessive refreshing
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const REFRESH_THROTTLE_MS = 2000; // 2 seconds minimum between refreshes

  // Refresh only orders data for real-time updates with throttling
  const refreshDashboardOrders = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_THROTTLE_MS) {
      console.log('Refresh throttled, skipping...');
      return;
    }

    try {
      setLastRefreshTime(now);
      console.log('Refreshing dashboard orders...');
      
      const dateParams =
        dateRange && dateRange.length === 2
          ? {
              startDate: dateRange[0].format("YYYY-MM-DD"),
              endDate: dateRange[1].format("YYYY-MM-DD"),
            }
          : {};

      const [recentOrdersResponse, statsResponse] = await Promise.all([
        dashboardService.getRecentOrders(10, dateParams),
        dashboardService.getDashboardStats(dateParams)
      ]);

      setRecentOrders(recentOrdersResponse.data);
      
      // Update hot orders (orders that need action)
      const actionableStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
      const filteredHotOrders = recentOrdersResponse.data.filter(order => 
        actionableStatuses.includes(order.order_status)
      );
      setHotOrders(filteredHotOrders);
      
      // Update stats to reflect new order counts
      setStats(statsResponse.data);
      
    } catch (error) {
      console.error("Error refreshing dashboard orders:", error);
    }
  }, [dateRange, lastRefreshTime]);

  // Order details functions
  const handleViewOrderDetails = async (order) => {
    try {
      setOrderDetailsLoading(true);
      setSelectedOrder(order); // Set initial order data immediately
      setOrderDetailsVisible(true);
      
      console.log('📋 Loading order details for order:', order);
      
      // Fetch full order details
      const response = await ordersService.getOrder(order.id);
      console.log('📋 Full order details received:', response.data);
      console.log('📋 Order items structure:', response.data.items);
      
      // Debug: Check first item structure if items exist
      if (response.data.items && response.data.items.length > 0) {
        console.log('📋 First item fields:', Object.keys(response.data.items[0]));
        console.log('📋 First item data:', response.data.items[0]);
      }
      
      // Merge the detailed data with the initial order data to ensure we have all fields
      const fullOrderData = {
        ...order, // Start with dashboard order data
        ...response.data, // Override with detailed data from API
        // Ensure required fields have fallbacks
        customer_phone: response.data.customer_phone || order.customer_phone || 'N/A',
        customer_email: response.data.customer_email || order.customer_email || 'N/A',
        delivery_address: response.data.delivery_address || order.delivery_address || order.shipping_address || 'No address specified',
        items: response.data.items || response.data.order_items || response.data.orderItems || []
      };
      
      setSelectedOrder(fullOrderData);
    } catch (error) {
      console.error("Error loading order details:", error);
      message.warning("Could not load full order details, showing available information");
      
      // If API fails, still show the modal with basic data and mock items if needed
      const fallbackOrderData = {
        ...order,
        customer_phone: order.customer_phone || order.phone || 'N/A',
        customer_email: order.customer_email || order.email || 'N/A', 
        delivery_address: order.delivery_address || order.shipping_address || order.address || 'No address specified',
        items: order.items || [
          // Add sample item if no items data available
          {
            id: 1,
            product_name: 'Order details not fully loaded',
            quantity: 1,
            price: order.total_amount || 0,
            note: 'Please check the Orders page for complete details'
          }
        ]
      };
      
      setSelectedOrder(fallbackOrderData);
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const handleOrderAction = async (orderId, action) => {
    try {
      // Add confirmation for cancel action
      if (action === 'cancel') {
        Modal.confirm({
          title: 'Cancel Order',
          content: 'Are you sure you want to cancel this order? This action cannot be undone.',
          okText: 'Yes, Cancel Order',
          okType: 'danger',
          cancelText: 'No, Keep Order',
          onOk: async () => {
            await performOrderAction(orderId, action);
          }
        });
        return;
      }
      
      await performOrderAction(orderId, action);
      
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      message.error({ content: `Failed to ${action} order: ${error.message}`, key: 'orderAction' });
    }
  };

  const performOrderAction = async (orderId, action) => {
    try {
      message.loading({ content: `Processing ${action}...`, key: 'orderAction' });
      
      let response;
      const statusMap = {
        'confirm': 'confirmed',
        'prepare': 'preparing', 
        'ready': 'ready',
        'cancel': 'cancelled'
      };
      
      const newStatus = statusMap[action];
      if (!newStatus) {
        throw new Error('Unknown action');
      }
      
      console.log(`Updating order ${orderId} to status ${newStatus}`);
      response = await ordersService.updateOrderStatus(orderId, newStatus, `Order ${action}ed from dashboard`);
      
      console.log('Order update response:', response);
      
      message.success({ content: `Order ${action}ed successfully`, key: 'orderAction' });
      
      // Refresh orders data
      await refreshDashboardOrders();
      
      // Close modal if open
      if (orderDetailsVisible) {
        setOrderDetailsVisible(false);
      }
      
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Failed to ${action} order`;
      message.error({ content: errorMessage, key: 'orderAction' });
      throw error;
    }
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    // Clear period when using custom date range
    if (dates && dates.length === 2) {
      setPeriod("custom");
    }
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    // Clear date range when using predefined periods
    if (value !== "custom") {
      setDateRange(null);
    }
  };

  const clearFilters = () => {
    setPeriod("week");
    setDateRange(null);
  };

  // Helper function to get period translation
  const getPeriodTranslation = (periodValue) => {
    const periodMap = {
      day: t("dashboard.today"),
      week: t("dashboard.thisWeek"),
      month: t("dashboard.thisMonth"),
      year: t("dashboard.thisYear"),
      custom: t("dashboard.customRange")
    };
    return periodMap[periodValue] || periodValue;
  };

  // Global product toggle handler
  const handleGlobalProductToggle = (action) => {
    const actionText = action === 'enable' ? 'enable' : 'disable';
    const actionTextAr = action === 'enable' ? 'تفعيل' : 'إلغاء تفعيل';
    
    Modal.confirm({
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} All Products`,
      content: `Are you sure you want to ${actionText} ALL products in the system? This action will affect all products across the application and client web.`,
      okText: `Yes, ${actionText} all`,
      cancelText: 'Cancel',
      okType: action === 'disable' ? 'danger' : 'primary',
      onOk: async () => {
        try {
          setGlobalToggleLoading(true);
          
          const result = await productsService.bulkToggleAll(action, `Bulk ${actionText} triggered from dashboard by ${user?.name || user?.email || 'admin'}`);
          
          message.success({
            content: `Successfully ${actionText}d ${result.data.affected_products} products`,
            duration: 5,
            style: { marginTop: '20vh' }
          });
          
          // Optionally refresh dashboard data if needed
          // refreshData();
          
        } catch (error) {
          console.error(`Global ${actionText} error:`, error);
          message.error({
            content: error.message || `Failed to ${actionText} products`,
            duration: 5,
            style: { marginTop: '20vh' }
          });
        } finally {
          setGlobalToggleLoading(false);
        }
      }
    });
  };

  // Export functions
  // Enhanced Dashboard Export with comprehensive analytics data
  const exportToExcel = async () => {
    try {
      message.loading({ content: t("common.loading"), key: "export" });
      
      // Prepare comprehensive dashboard data
      const dashboardData = {
        stats: {
          ...stats,
          // Add growth calculations
          ordersGrowth: stats.ordersGrowth || 0,
          revenueGrowth: stats.revenueGrowth || 0,
          customersGrowth: stats.customersGrowth || 0,
          aovGrowth: stats.aovGrowth || 0,
          // Add previous period data for comparison
          previousOrders: stats.previousOrders || 0,
          previousRevenue: stats.previousRevenue || 0,
          previousCustomers: stats.previousCustomers || 0,
          previousAOV: stats.previousAOV || 0,
          pendingOrders: stats.pendingOrders || pendingOrdersCount || 0
        },
        orderFlow,
        salesData,
        topProducts,
        recentOrders,
        hotOrders,
        customerStats,
        inventoryAlerts,
        recentNotifications,
        shippingAnalytics,
        period: period,
        dateRange: dateRange && dateRange.length === 2 ? [
          dateRange[0].format('YYYY-MM-DD'),
          dateRange[1].format('YYYY-MM-DD')
        ] : null
      };

      // Use comprehensive export utility
      await exportDashboardToExcel(dashboardData, {
        filename: `FECS_Dashboard_Complete_Analytics_${period}`,
        t: t
      });

      message.success({ content: t("dashboard.exportSuccess"), key: "export" });
    } catch (error) {
      console.error('Dashboard export error:', error);
      message.error({ content: t("dashboard.exportError"), key: "export" });
    }
  };

  // Export Recent Orders with complete details
  const exportRecentOrders = async () => {
    try {
      if (!recentOrders || recentOrders.length === 0) {
        message.warning('No recent orders to export');
        return;
      }

      message.loading('Preparing recent orders export...', 0);

      // Fetch complete order details for recent orders
      const ordersWithDetails = await Promise.all(
        recentOrders.map(async (order) => {
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

      // Use comprehensive orders export
      await exportOrdersToExcel(ordersWithDetails, {
        includeItems: true,
        includeStatusHistory: true,
        filename: `FECS_Dashboard_Recent_Orders_${recentOrders.length}_Orders`,
        t: t
      });

      message.destroy();
      
    } catch (error) {
      message.destroy();
      console.error('Recent orders export error:', error);
      message.error('Failed to export recent orders. Please try again.');
    }
  };

  // Export Hot Orders with priority details
  const exportHotOrders = async () => {
    try {
      if (!hotOrders || hotOrders.length === 0) {
        message.warning('No hot orders to export');
        return;
      }

      message.loading('Preparing hot orders export...', 0);

      // Fetch complete order details for hot orders
      const ordersWithDetails = await Promise.all(
        hotOrders.map(async (order) => {
          try {
            const detailResponse = await ordersService.getOrder(order.id);
            const orderDetails = detailResponse.data?.order || order;
            
            return {
              ...order,
              ...orderDetails,
              items: detailResponse.data?.items || order.items || [],
              status_history: detailResponse.data?.status_history || order.status_history || [],
              priority: 'HIGH', // Mark as high priority
              urgent: true
            };
          } catch (error) {
            console.warn(`Failed to fetch details for hot order ${order.id}:`, error);
            return { ...order, priority: 'HIGH', urgent: true };
          }
        })
      );

      // Use comprehensive orders export
      await exportOrdersToExcel(ordersWithDetails, {
        includeItems: true,
        includeStatusHistory: true,
        filename: `FECS_Dashboard_Hot_Orders_URGENT_${hotOrders.length}_Orders`,
        t: t
      });

      message.destroy();
      
    } catch (error) {
      message.destroy();
      console.error('Hot orders export error:', error);
      message.error('Failed to export hot orders. Please try again.');
    }
  };

  const exportToPDF = async () => {
    try {
      message.loading({ content: t("common.loading"), key: "export" });
      
      // Create comprehensive printable content
      const ordersTableRows = recentOrders.map(order => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${order.order_number}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${order.customer_name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(order.total_amount)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${order.order_status}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(order.created_at)}</td>
        </tr>
      `).join('');
      
      const productsTableRows = topProducts.map(product => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${product.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${product.total_sold}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(product.total_revenue)}</td>
        </tr>
      `).join('');
      
      const printContent = `
        <html>
          <head>
            <title>${t("dashboard.title")} - Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1890ff; padding-bottom: 20px; }
              .header h1 { color: #1890ff; margin: 0; font-size: 28px; }
              .header p { margin: 5px 0; color: #666; }
              .section { margin: 30px 0; }
              .section h2 { color: #1890ff; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
              .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
              .stat-box { background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; }
              .stat-box .label { color: #666; font-size: 14px; }
              .stat-box .value { color: #1890ff; font-size: 20px; font-weight: bold; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th { background: #1890ff; color: white; padding: 12px 8px; border: 1px solid #ddd; text-align: left; }
              td { padding: 8px; border: 1px solid #ddd; }
              tr:nth-child(even) { background: #f9f9f9; }
              .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📊 ${t("dashboard.title")}</h1>
              <p><strong>${t("dashboard.reportGenerated")}:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Period:</strong> ${dateRange ? `${dateRange[0].format('YYYY-MM-DD')} to ${dateRange[1].format('YYYY-MM-DD')}` : 'All Time'}</p>
            </div>
            
            <div class="section">
              <h2>📊 Dashboard Statistics</h2>
              <div class="stats-grid">
                <div class="stat-box">
                  <div class="label">Total Orders</div>
                  <div class="value">${stats.totalOrders || 0}</div>
                </div>
                <div class="stat-box">
                  <div class="label">Total Revenue</div>
                  <div class="value">${formatCurrency(stats.totalRevenue || 0)}</div>
                </div>
                <div class="stat-box">
                  <div class="label">Total Customers</div>
                  <div class="value">${stats.totalCustomers || 0}</div>
                </div>
                <div class="stat-box">
                  <div class="label">Pending Orders</div>
                  <div class="value">${stats.pendingOrders || 0}</div>
                </div>
              </div>
            </div>
            
            ${recentOrders.length > 0 ? `
            <div class="section">
              <h2>📋 Recent Orders</h2>
              <table>
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${ordersTableRows}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            ${topProducts.length > 0 ? `
            <div class="section">
              <h2>🏆 Top Products</h2>
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${productsTableRows}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <div class="footer">
              <p>${t("dashboard.reportFooter")} • ${new Date().getFullYear()} ${t("dashboard.allRightsReserved")}</p>
            </div>
          </body>
        </html>
      `;
      
      // Create and trigger print
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        message.success({ content: t("dashboard.exportSuccess"), key: "export" });
      }, 500);
      
    } catch (error) {
      console.error('PDF Export error:', error);
      message.error({ content: t("dashboard.exportError"), key: "export" });
    }
  };

  const exportMenuItems = [
    {
      key: 'dashboard-complete',
      label: (
        <span>
          <FileExcelOutlined style={{ marginRight: 8, color: '#52c41a' }} />
          📊 Complete Dashboard Analytics (Excel)
        </span>
      ),
      onClick: exportToExcel,
    },
    {
      key: 'recent-orders',
      label: (
        <span>
          <FileExcelOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          📋 Recent Orders ({recentOrders?.length || 0} orders)
        </span>
      ),
      onClick: exportRecentOrders,
      disabled: !recentOrders || recentOrders.length === 0,
    },
    {
      key: 'hot-orders',
      label: (
        <span>
          <FileExcelOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
          🔥 Hot Orders ({hotOrders?.length || 0} urgent)
        </span>
      ),
      onClick: exportHotOrders,
      disabled: !hotOrders || hotOrders.length === 0,
    },
    {
      type: 'divider',
    },
    {
      key: 'pdf',
      label: (
        <span>
          <FilePdfOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
          {t("dashboard.exportPDF")} (Legacy)
        </span>
      ),
      onClick: exportToPDF,
    },
  ];

  // Chart configurations
  const orderFlowConfig = {
    data: orderFlow,
    xField: "period",
    yField: "orders",
    point: {
      size: 5,
      shape: "diamond",
    },
    smooth: true,
    color: "#1890ff",
    meta: {
      orders: {
        alias: t("dashboard.orders"),
        formatter: (value) => formatNumber(value),
      },
      period: {
        alias: t("dashboard.period"),
        formatter: (value) => {
          const date = dayjs(value);
          return date.isValid() ? date.format("YYYY/MM/DD") : value;
        },
      },
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name: t("dashboard.orders"),
          value: formatNumber(datum.orders || 0),
        };
      },
    },
    yAxis: {
      label: {
        formatter: (value) => formatNumber(value),
      },
      title: {
        text: t("dashboard.orders"),
      },
    },
    xAxis: {
      label: {
        formatter: (value) => {
          const date = dayjs(value);
          return date.isValid() ? date.format("MM/DD") : value;
        },
      },
      title: {
        text: t("dashboard.period"),
      },
    },
  };

  // Helper component for displaying order items preview in table
  const OrderItemsPreview = ({ items, formatPrice }) => {
    if (!items || items.length === 0) {
      return <span style={{ color: '#999', fontSize: '12px' }}>No items</span>;
    }
    
    const maxDisplay = 2; // Show first 2 items
    const displayItems = items.slice(0, maxDisplay);
    const remainingCount = items.length - maxDisplay;
    
    return (
      <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
        {displayItems.map((item, index) => {
          // Get product name from various possible fields
          const productName = item?.product_name || 
                             item?.product_title_en || 
                             item?.product_title_ar || 
                             item?.name || 
                             item?.title_en || 
                             item?.title_ar ||
                             'Unknown Product';
          
          const quantity = Number(item?.quantity || 1);
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

  // Table columns
  const orderColumns = [
    {
      title: t("dashboard.orderId"),
      dataIndex: "order_number",
      key: "order_number",
      render: (text, record) => (
        <Button 
          type="link" 
          style={{ padding: 0, height: 'auto', fontWeight: 'bold' }}
          onClick={() => handleViewOrderDetails(record)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: t("dashboard.customer"),
      dataIndex: "customer_name",
      key: "customer_name",
    },
    {
      title: t("dashboard.amount"),
      dataIndex: "total_amount",
      key: "total_amount",
      render: (amount) => <Text strong>{formatCurrency(amount)}</Text>,
    },
    {
      title: t("dashboard.status"),
      dataIndex: "order_status",
      key: "order_status",
      render: (status) => {
        const colors = {
          pending: "warning",
          confirmed: "processing",
          preparing: "blue",
          ready: "cyan",
          out_for_delivery: "geekblue",
          delivered: "success",
          cancelled: "error",
        };
        return (
          <Tag color={colors[status] || "default"}>
            {t(`dashboard.status_${status}`) || status}
          </Tag>
        );
      },
    },
    {
      title: t("dashboard.date"),
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => formatDate(date, "short"),
    },
    {
      title: 'Items',
      key: 'items',
      width: 280,
      render: (_, record) => {
        const items = record.items || record.order_items || record.orderItems || [];
        return (
          <div style={{ maxWidth: '260px' }}>
            <OrderItemsPreview items={items} formatPrice={formatCurrency} />
          </div>
        );
      },
    },
    {
      title: t("dashboard.actions"),
      key: "actions",
      width: 200,
      render: (_, record) => {
        const { order_status } = record;
        return (
          <Space size="small">
            <Tooltip title="View Details">
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => handleViewOrderDetails(record)}
              />
            </Tooltip>
            
            {order_status === 'pending' && (
              <>
                <Tooltip title="Confirm Order">
                  <Button 
                    type="text" 
                    icon={<CheckOutlined />} 
                    size="small"
                    style={{ color: '#52c41a' }}
                    onClick={() => handleOrderAction(record.id, 'confirm')}
                  />
                </Tooltip>
              </>
            )}
            
            {order_status === 'confirmed' && (
              <Tooltip title="Start Preparing">
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  size="small"
                  style={{ color: '#1890ff' }}
                  onClick={() => handleOrderAction(record.id, 'prepare')}
                />
              </Tooltip>
            )}
            
            {order_status === 'preparing' && (
              <Tooltip title="Mark as Ready">
                <Button 
                  type="text" 
                  icon={<CheckOutlined />} 
                  size="small"
                  style={{ color: '#52c41a' }}
                  onClick={() => handleOrderAction(record.id, 'ready')}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const topProductsColumns = [
    {
      title: t("dashboard.product"),
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t("dashboard.sold"),
      dataIndex: "total_sold",
      key: "total_sold",
      render: (value) => <Text>{formatNumber(value)}</Text>,
    },
    {
      title: t("dashboard.revenue"),
      dataIndex: "total_revenue",
      key: "total_revenue",
      render: (value) => (
        <Text strong type="success">
          {formatCurrency(value)}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Global Styles for Dashboard */}
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes slideInUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 6px 16px rgba(255, 77, 79, 0.2); }
          50% { box-shadow: 0 8px 20px rgba(255, 77, 79, 0.4); }
          100% { box-shadow: 0 6px 16px rgba(255, 77, 79, 0.2); }
        }
        
        .new-order-row {
          animation: slideInUp 0.8s ease-out;
          background: linear-gradient(90deg, #fff7e6, #ffffff) !important;
          border-left: 4px solid #faad14 !important;
        }
        
        .dashboard-order-row:hover {
          background-color: #f0f8ff !important;
          transform: translateY(-1px);
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .hot-orders-card {
          animation: glow 2s ease-in-out infinite;
        }
        
        .socket-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .socket-indicator.connected {
          background: #52c41a;
          color: white;
        }
        
        .socket-indicator.disconnected {
          background: #ff4d4f;
          color: white;
        }
        
        .pulse-tag {
          animation: pulse 1s infinite;
        }
      `}</style>

      {/* Socket Connection Indicator */}
      <div 
        className={`socket-indicator ${isSocketConnected ? 'connected' : 'disconnected'}`}
        title={`Socket: ${isSocketConnected ? 'Connected' : 'Disconnected'}`}
      >
        🔌 {isSocketConnected ? 'Live' : 'Offline'}
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              {t("dashboard.title")}
            </Title>
            <Text type="secondary">{t("dashboard.subtitle")}</Text>
          </Col>
          <Col>
            <Space wrap>
              {/* Global Product Toggle */}
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'enable-all',
                      label: (
                        <span style={{ color: '#52c41a' }}>
                          <PoweroffOutlined style={{ marginRight: 8 }} />
                          🟢 Enable All Products
                        </span>
                      ),
                      onClick: () => handleGlobalProductToggle('enable'),
                    },
                    {
                      key: 'disable-all',
                      label: (
                        <span style={{ color: '#ff4d4f' }}>
                          <PoweroffOutlined style={{ marginRight: 8 }} />
                          🔴 Disable All Products
                        </span>
                      ),
                      onClick: () => handleGlobalProductToggle('disable'),
                    },
                  ],
                }}
                placement="bottomLeft"
              >
                <Button 
                  icon={<PoweroffOutlined />}
                  loading={globalToggleLoading}
                  style={{
                    borderColor: globalToggleLoading ? '#1890ff' : '#d9d9d9',
                    backgroundColor: globalToggleLoading ? '#f6ffed' : 'white'
                  }}
                >
                  Products Control ▼
                </Button>
              </Dropdown>
              
              <Select
                value={period}
                onChange={handlePeriodChange}
                style={{ width: 120 }}
              >
                <Option value="day">{t("dashboard.today")}</Option>
                <Option value="week">{t("dashboard.thisWeek")}</Option>
                <Option value="month">{t("dashboard.thisMonth")}</Option>
                <Option value="year">{t("dashboard.thisYear")}</Option>
                <Option value="custom">{t("dashboard.customRange")}</Option>
              </Select>

              {period === "custom" && (
                <RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  style={{ width: 240 }}
                  placeholder={[
                    t("dashboard.startDate"),
                    t("dashboard.endDate"),
                  ]}
                  format="YYYY-MM-DD"
                />
              )}

              {(period === "custom" || dateRange) && (
                <Button
                  onClick={clearFilters}
                  title={t("dashboard.clearFilters")}
                >
                  {t("dashboard.clear")}
                </Button>
              )}

              <Button
                icon={<ReloadOutlined />}
                onClick={refreshData}
                loading={statsLoading}
              >
                {t("common.refresh")}
              </Button>

              <Dropdown
                menu={{
                  items: exportMenuItems,
                }}
                placement="bottomLeft"
              >
                <Button icon={<DownloadOutlined />}>
                  {t("dashboard.export")} ▼
                </Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>
      </div>


      {/* Hot Orders Section */}
      {hotOrders.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card
              title={
                <Space>
                  <span style={{ color: '#ff4d4f', fontSize: '18px', fontWeight: 'bold' }}>
                    🔥 {t("dashboard.hotOrders")}
                  </span>
                  <Tag color="red" style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {hotOrders.length} {t("dashboard.needsAction")}
                  </Tag>
                  {newOrderAnimation && (
                    <Tag 
                      color="gold" 
                      className="pulse-tag"
                      style={{ 
                        fontWeight: 'bold', 
                        fontSize: '12px'
                      }}
                    >
                      NEW!
                    </Tag>
                  )}
                </Space>
              }
              extra={
                <Space>
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    {t("dashboard.requiresAttention")}
                  </Text>
                  <Button type="link" href="/orders" style={{ color: '#ff4d4f' }}>
                    {t("dashboard.viewAll")}
                  </Button>
                </Space>
              }
              style={{ 
                border: '3px solid #ff7875',
                background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)'
              }}
              bodyStyle={{ padding: '12px' }}
              className="hot-orders-card"
            >
              <Table
                dataSource={hotOrders}
                columns={[
                  {
                    title: t("dashboard.orderId"),
                    dataIndex: "order_number",
                    key: "order_number",
                    render: (text, record) => (
                      <Button 
                        type="link" 
                        style={{ padding: 0, height: 'auto', fontWeight: 'bold', color: '#ff4d4f' }}
                        onClick={() => handleViewOrderDetails(record)}
                      >
                        {text}
                      </Button>
                    ),
                  },
                  {
                    title: t("dashboard.customer"),
                    dataIndex: "customer_name",
                    key: "customer_name",
                  },
                  {
                    title: t("dashboard.amount"),
                    dataIndex: "total_amount",
                    key: "total_amount",
                    render: (amount) => <Text strong style={{ color: '#ff4d4f' }}>{formatCurrency(amount)}</Text>,
                  },
                  {
                    title: t("dashboard.status"),
                    dataIndex: "order_status",
                    key: "order_status",
                    render: (status) => (
                      <Tag color="warning">
                        {t(`dashboard.status_${status}`) || status}
                      </Tag>
                    ),
                  },
                  {
                    title: t("dashboard.actions"),
                    key: "actions",
                    render: (_, record) => (
                      <Space size="small">
                        <Tooltip title="View Details">
                          <Button 
                            type="text" 
                            icon={<EyeOutlined />} 
                            size="small"
                            onClick={() => handleViewOrderDetails(record)}
                          />
                        </Tooltip>
                        {record.order_status === 'pending' && (
                          <Tooltip title="Confirm Order">
                            <Button 
                              type="text" 
                              icon={<CheckOutlined />} 
                              size="small"
                              style={{ color: '#52c41a' }}
                              onClick={() => handleOrderAction(record.id, 'confirm')}
                            />
                          </Tooltip>
                        )}
                      </Space>
                    ),
                  },
                ]}
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
                rowKey="id"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Shipping Analytics Section */}
      {shippingAnalytics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card
              title={`🚚 ${t("dashboard.shippingAnalytics")}`}
              extra={
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={loadShippingAnalytics}
                >
                  {t("common.refresh")}
                </Button>
              }
            >
              <Row gutter={16}>
                <Col xs={24} sm={6}>
                  <Statistic
                    title={t("dashboard.avgDistance")}
                    value={shippingAnalytics.distance_statistics?.avg_distance || 0}
                    suffix="km"
                    precision={1}
                    prefix="🛣️"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title={t("dashboard.avgShippingCost")}
                    value={shippingAnalytics.distance_statistics?.avg_shipping_cost || 0}
                    suffix="JOD"
                    precision={2}
                    prefix="💰"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title={t("dashboard.freeShippingRate")}
                    value={shippingAnalytics.free_shipping_analysis?.free_shipping_percentage || 0}
                    suffix="%"
                    precision={1}
                    prefix="🎁"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title={t("dashboard.totalCalculations")}
                    value={shippingAnalytics.calculation_summary?.total_calculations || 0}
                    prefix="📊"
                  />
                </Col>
              </Row>
              
              {shippingAnalytics.zone_usage && (
                <div style={{ marginTop: 16 }}>
                  <Typography.Title level={5}>{t("dashboard.popularZones")}</Typography.Title>
                  <Row gutter={8}>
                    {shippingAnalytics.zone_usage
                      .slice(0, 3)
                      .map((zone, index) => (
                        <Col key={zone.zone_name_en}>
                          <Tag
                            color={["blue", "green", "orange"][index]}
                            style={{ marginBottom: 4 }}
                          >
                            {zone.zone_name_en}: {zone.usage_count} {t("dashboard.ordersText")}
                          </Tag>
                        </Col>
                      ))}
                  </Row>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.totalOrders")}
              value={formatCompactNumber(stats.totalOrders || 0)}
              prefix={<ShoppingCartOutlined />}
              suffix={
                <span
                  style={{
                    fontSize: "14px",
                    color: stats.ordersGrowth >= 0 ? "#52c41a" : "#ff4d4f",
                  }}
                >
                  {stats.ordersGrowth >= 0 ? (
                    <RiseOutlined />
                  ) : (
                    <FallOutlined />
                  )}
                  {formatPercentage(stats.ordersGrowth || 0)}
                </span>
              }
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.totalRevenue")}
              value={formatCurrency(stats.totalRevenue || 0)}
              prefix={<DollarCircleOutlined />}
              suffix={
                <span
                  style={{
                    fontSize: "14px",
                    color: stats.revenueGrowth >= 0 ? "#52c41a" : "#ff4d4f",
                  }}
                >
                  {stats.revenueGrowth >= 0 ? (
                    <RiseOutlined />
                  ) : (
                    <FallOutlined />
                  )}
                  {formatPercentage(stats.revenueGrowth || 0)}
                </span>
              }
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.totalCustomers")}
              value={formatCompactNumber(stats.totalCustomers || 0)}
              prefix={<UserOutlined />}
              suffix={
                <span
                  style={{
                    fontSize: "14px",
                    color: stats.customersGrowth >= 0 ? "#52c41a" : "#ff4d4f",
                  }}
                >
                  {stats.customersGrowth >= 0 ? (
                    <RiseOutlined />
                  ) : (
                    <FallOutlined />
                  )}
                  {formatPercentage(stats.customersGrowth || 0)}
                </span>
              }
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.averageOrder")}
              value={formatCurrency(stats.averageOrderValue || 0)}
              prefix={<ShopOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={24}>
          <Card
            title={t("dashboard.orderFlow")}
            extra={
              <Text type="secondary">
                {period === "custom" && dateRange && dateRange.length === 2
                  ? `${dateRange[0].format("MMM DD")} - ${dateRange[1].format(
                      "MMM DD, YYYY"
                    )}`
                  : getPeriodTranslation(period)}
              </Text>
            }
          >
            {orderFlow.length > 0 ? (
              <div style={{ width: "100%", padding: 16 }}>
                <Line {...orderFlowConfig} height={300} />
              </div>
            ) : (
              <div
                style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text type="secondary">{t("dashboard.noData")}</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Data Tables Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={t("dashboard.recentOrders")}
            extra={
              <Button type="link" href="/orders">
                {t("dashboard.viewAll")}
              </Button>
            }
          >
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
              rowKey="id"
              onRow={(record) => ({
                onClick: () => handleViewOrderDetails(record),
                style: { cursor: 'pointer' },
              })}
              rowClassName="dashboard-order-row"
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={t("dashboard.topProducts")}
            extra={<TrophyOutlined style={{ color: "#faad14" }} />}
          >
            <Table
              dataSource={topProducts}
              columns={topProductsColumns}
              pagination={false}
              size="small"
              showHeader={false}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={t("dashboard.inventoryAlerts")}
            extra={<WarningOutlined style={{ color: "#faad14" }} />}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              {inventoryAlerts.length > 0 ? (
                inventoryAlerts.map((item, index) => (
                  <Alert
                    key={index}
                    message={item.name}
                    description={`${t("dashboard.stock")}: ${
                      t(`dashboard.stock_${item.stock_status}`) ||
                      item.stock_status
                    }`}
                    type={
                      item.stock_status === "out_of_stock" ? "error" : "warning"
                    }
                    showIcon
                    size="small"
                  />
                ))
              ) : (
                <Text type="secondary">{t("dashboard.noAlerts")}</Text>
              )}
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} lg={10}>
          <NotificationsDashboardWidget
            height={350}
            showRecentList={true}
            showStatistics={true}
            autoRefresh={true}
            refreshInterval={30000}
          />
        </Col>
        
        <Col xs={24} lg={6}>
          <NotificationQuickActions />
        </Col>
      </Row>

      <QuickNotificationFAB />

      {/* Order Details Modal */}
      <Modal
        title={selectedOrder ? `Order Details - ${selectedOrder.order_number}` : 'Order Details'}
        open={orderDetailsVisible}
        onCancel={() => setOrderDetailsVisible(false)}
        width={800}
        footer={
          selectedOrder ? (
            <Space>
              {selectedOrder.order_status === 'pending' && (
                <>
                  <Button 
                    type="primary" 
                    icon={<CheckOutlined />}
                    onClick={() => handleOrderAction(selectedOrder.id, 'confirm')}
                  >
                    Confirm Order
                  </Button>
                  <Button 
                    danger 
                    icon={<CloseOutlined />}
                    onClick={() => handleOrderAction(selectedOrder.id, 'cancel')}
                  >
                    Cancel Order
                  </Button>
                </>
              )}
              
              {selectedOrder.order_status === 'confirmed' && (
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={() => handleOrderAction(selectedOrder.id, 'prepare')}
                >
                  Start Preparing
                </Button>
              )}
              
              {selectedOrder.order_status === 'preparing' && (
                <Button 
                  type="primary" 
                  icon={<CheckOutlined />}
                  onClick={() => handleOrderAction(selectedOrder.id, 'ready')}
                >
                  Mark as Ready
                </Button>
              )}
              
              <Button onClick={() => setOrderDetailsVisible(false)}>
                Close
              </Button>
            </Space>
          ) : null
        }
      >
        {orderDetailsLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : selectedOrder ? (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" title="Order Information">
                  <p><strong>Order Number:</strong> {selectedOrder.order_number || 'N/A'}</p>
                  <p><strong>Status:</strong> 
                    <Tag 
                      color={
                        selectedOrder.order_status === 'pending' ? 'warning' :
                        selectedOrder.order_status === 'confirmed' ? 'processing' :
                        selectedOrder.order_status === 'preparing' ? 'blue' :
                        selectedOrder.order_status === 'ready' ? 'cyan' :
                        selectedOrder.order_status === 'delivered' ? 'success' : 'default'
                      }
                      style={{ marginLeft: 8 }}
                    >
                      {selectedOrder.order_status || 'Unknown'}
                    </Tag>
                  </p>
                  <p><strong>Total Amount:</strong> {selectedOrder.total_amount ? formatCurrency(selectedOrder.total_amount) : 'N/A'}</p>
                  <p><strong>Created:</strong> {selectedOrder.created_at ? formatDate(selectedOrder.created_at) : 'N/A'}</p>
                  {selectedOrder.notes && (
                    <p><strong>Notes:</strong> {selectedOrder.notes}</p>
                  )}
                </Card>
              </Col>
              
              <Col span={12}>
                <Card size="small" title="Customer Information">
                  <p><strong>Name:</strong> {selectedOrder.customer_name || 'N/A'}</p>
                  <p><strong>Phone:</strong> {selectedOrder.customer_phone || 'N/A'}</p>
                  <p><strong>Email:</strong> {selectedOrder.customer_email || 'N/A'}</p>
                  {selectedOrder.customer_id && (
                    <p><strong>Customer ID:</strong> {selectedOrder.customer_id}</p>
                  )}
                </Card>
              </Col>
            </Row>
            
            <Card size="small" title="Delivery Address" style={{ marginTop: 16 }}>
              {(() => {
                console.log('🏠 Order data for address analysis:', selectedOrder);
                
                // Get delivery address from the API structure
                const deliveryAddr = selectedOrder.delivery_address;
                
                if (!deliveryAddr) {
                  return (
                    <div style={{ color: '#999', fontStyle: 'italic' }}>
                      <p>No delivery address available</p>
                      <p style={{ fontSize: '12px' }}>
                        This might be a pickup order or address data is missing
                      </p>
                    </div>
                  );
                }
                
                // Build complete address from the delivery_address object
                const addressParts = [];
                
                // Add full name if different from customer name
                if (deliveryAddr.full_name && deliveryAddr.full_name !== selectedOrder.customer_name) {
                  addressParts.push(`Attn: ${deliveryAddr.full_name}`);
                }
                
                // Add address line (building, floor details)
                if (deliveryAddr.address_line) {
                  addressParts.push(deliveryAddr.address_line);
                }
                
                // Build location hierarchy
                const locationParts = [];
                if (deliveryAddr.area || deliveryAddr.area_ar) {
                  locationParts.push(deliveryAddr.area || deliveryAddr.area_ar);
                }
                if (deliveryAddr.city || deliveryAddr.city_ar) {
                  locationParts.push(deliveryAddr.city || deliveryAddr.city_ar);
                }
                if (deliveryAddr.governorate || deliveryAddr.governorate_ar) {
                  locationParts.push(deliveryAddr.governorate || deliveryAddr.governorate_ar);
                }
                
                if (locationParts.length > 0) {
                  addressParts.push(locationParts.join(', '));
                }
                
                const fullAddress = addressParts.join('\n');
                const hasGPS = deliveryAddr.latitude && deliveryAddr.longitude;
                
                console.log('🏠 Built address:', fullAddress);
                console.log('🏠 GPS coordinates:', hasGPS ? `${deliveryAddr.latitude}, ${deliveryAddr.longitude}` : 'None');
                
                return (
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Address:</strong>
                      {fullAddress ? (
                        <div style={{ whiteSpace: 'pre-line', marginTop: '8px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                          {fullAddress}
                        </div>
                      ) : (
                        <span style={{ color: '#999', marginLeft: '8px' }}>No address specified</span>
                      )}
                    </div>
                    
                    {/* Contact Information */}
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                      {deliveryAddr.full_name && (
                        <div><strong>Contact:</strong> {deliveryAddr.full_name}</div>
                      )}
                      {selectedOrder.customer_phone && (
                        <div><strong>Phone:</strong> {selectedOrder.customer_phone}</div>
                      )}
                    </div>
                    
                    {/* GPS Coordinates */}
                    {hasGPS && (
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                        <strong>GPS Coordinates:</strong> {deliveryAddr.latitude}, {deliveryAddr.longitude}
                        <a 
                          href={`https://maps.google.com/?q=${deliveryAddr.latitude},${deliveryAddr.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ marginLeft: '8px', color: '#1890ff' }}
                        >
                          📍 View on Map
                        </a>
                      </div>
                    )}
                    
                    {/* Delivery Information */}
                    <div style={{ marginTop: '12px' }}>
                      {selectedOrder.delivery_fee !== undefined && (
                        <p style={{ margin: '4px 0' }}>
                          <strong>Delivery Fee:</strong> {formatCurrency(selectedOrder.delivery_fee)}
                        </p>
                      )}
                      
                      {selectedOrder.order_type && (
                        <p style={{ margin: '4px 0' }}>
                          <strong>Order Type:</strong> {
                            selectedOrder.order_type === 'delivery' ? '🚚 Delivery' : 
                            selectedOrder.order_type === 'pickup' ? '🏪 Pickup' : 
                            selectedOrder.order_type
                          }
                        </p>
                      )}
                      
                      {selectedOrder.estimated_delivery_time && (
                        <p style={{ margin: '4px 0' }}>
                          <strong>Estimated Delivery:</strong> {formatDate(selectedOrder.estimated_delivery_time)}
                        </p>
                      )}
                    </div>
                    
                    {/* Debug Panel - show delivery address structure */}
                    {process.env.NODE_ENV === 'development' && (
                      <details style={{ fontSize: '10px', marginTop: '16px' }}>
                        <summary style={{ cursor: 'pointer', color: '#666' }}>
                          Debug - Delivery Address Object
                        </summary>
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '8px', 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          <pre style={{ margin: 0, fontSize: '10px' }}>
                            {JSON.stringify(deliveryAddr, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })()}
            </Card>
            
            <Card size="small" title="Order Items" style={{ marginTop: 16 }}>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {selectedOrder.items.map((item, index) => (
                    <OrderItemCard 
                      key={index} 
                      item={item} 
                      formatPrice={formatCurrency} 
                    />
                  ))}
                  
                  {/* Order Items Summary */}
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    backgroundColor: '#fafafa', 
                    borderRadius: '6px',
                    borderTop: '2px solid #1890ff'
                  }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text strong style={{ fontSize: '14px' }}>
                          Total Items: {selectedOrder.items.length}
                        </Text>
                      </Col>
                      <Col>
                        <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                          Order Total: {formatCurrency(selectedOrder.total_amount)}
                        </Text>
                      </Col>
                    </Row>
                    
                    {/* Calculate total discount */}
                    {(() => {
                      const totalDiscount = selectedOrder.items.reduce((acc, item) => {
                        const unitPrice = Number(item?.unit_price || item?.price || 0);
                        const quantity = Number(item?.quantity || 0);
                        const totalPrice = Number(item?.total_price || (unitPrice * quantity));
                        const calculatedTotal = unitPrice * quantity;
                        const discount = calculatedTotal - totalPrice;
                        return acc + (discount > 0.01 ? discount : 0);
                      }, 0);
                      
                      return totalDiscount > 0.01 && (
                        <Row justify="space-between" style={{ marginTop: '8px' }}>
                          <Col>
                            <Text style={{ color: '#fa8c16', fontSize: '13px' }}>
                              Total Savings:
                            </Text>
                          </Col>
                          <Col>
                            <Text strong style={{ color: '#fa8c16', fontSize: '14px' }}>
                              -{formatCurrency(totalDiscount)}
                            </Text>
                          </Col>
                        </Row>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <ShoppingCartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No items found for this order</p>
                  <p style={{ fontSize: '12px' }}>This might be due to missing data or order synchronization issues</p>
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default DashboardContent;
