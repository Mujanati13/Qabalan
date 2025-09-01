import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService, { Order, PaginatedResponse } from '../services/apiService';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { Typography, Spacing, BorderRadius, Shadow } from '../theme';
import guestOrderService, { GuestOrder } from '../services/guestOrderService';

interface OrdersScreenProps {
  navigation: any;
}

const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user, isGuest } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const statusFilters = [
    { key: '', label: t('orders.allOrders') },
    { key: 'pending', label: t('orders.statusLabels.pending') },
    { key: 'confirmed', label: t('orders.statusLabels.confirmed') },
    { key: 'preparing', label: t('orders.statusLabels.preparing') },
    { key: 'ready', label: t('orders.statusLabels.ready') },
    { key: 'out_for_delivery', label: t('orders.statusLabels.out_for_delivery') },
    { key: 'delivered', label: t('orders.statusLabels.delivered') },
    { key: 'cancelled', label: t('orders.statusLabels.cancelled') },
  ];

  useEffect(() => {
    loadOrders(true);
  }, [selectedStatus]);

  // 🔄 SOLUTION: Add useFocusEffect to refresh orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 OrdersScreen focused - refreshing orders');
      loadOrders(true);
    }, [selectedStatus])
  );

  const loadOrders = async (reset: boolean = false) => {
    // Handle guest users differently
    if (isGuest) {
      console.log('👤 Loading orders for guest user');
      try {
        if (reset) {
          setLoading(true);
          setCurrentPage(1);
        } else {
          setLoadingMore(true);
        }

        const page = reset ? 1 : currentPage;
        const result = await guestOrderService.getGuestOrdersPaginated({
          page,
          limit: 20,
          status: selectedStatus || undefined,
        });

        console.log('📦 Guest orders loaded:', result.orders.length);

        if (reset) {
          setOrders(result.orders as Order[]);
        } else {
          setOrders(prev => [...prev, ...(result.orders as Order[])]);
        }

        setHasMorePages(result.pagination.hasMore);
        setCurrentPage(page + 1);

      } catch (error) {
        console.error('Error loading guest orders:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
      return;
    }

    // Handle authenticated users
    if (!user || !user.id) {
      console.warn('❌ No user found for loading orders');
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }

    // Validate user ID is a positive integer
    const userId = parseInt(user.id.toString());
    if (!userId || userId <= 0 || !Number.isInteger(userId)) {
      console.error('❌ Invalid user ID:', user.id, 'Parsed:', userId);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }

    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      const page = reset ? 1 : currentPage;
      console.log('🔄 Loading orders for user:', userId, 'page:', page, 'status:', selectedStatus);
      
      const response = await ApiService.getUserOrders(userId, {
        page,
        limit: 20,
        status: selectedStatus || undefined,
      });

      console.log('📦 Orders API response:', response);

      if (response.success && response.data) {
        // Handle both possible response structures
        const newOrders = Array.isArray(response.data) 
          ? response.data 
          : Array.isArray(response.data.data) 
            ? response.data.data 
            : [];
        
        console.log('✅ Loaded orders:', newOrders.length);
        
        // Validate orders data structure
        const validOrders = newOrders.filter(order => {
          if (!order || typeof order !== 'object') {
            console.warn('⚠️  Invalid order object:', order);
            return false;
          }
          return true;
        });
        
        console.log('✅ Valid orders after filtering:', validOrders.length);
        
        if (reset) {
          setOrders(validOrders);
        } else {
          setOrders(prev => [...prev, ...validOrders]);
        }

        // Handle pagination - could be in response.data.pagination or response.pagination
        const pagination = response.data.pagination || (response as any).pagination;
        if (pagination && typeof pagination.page === 'number' && typeof pagination.totalPages === 'number') {
          setHasMorePages(pagination.page < pagination.totalPages);
          setCurrentPage(page + 1);
        } else {
          setHasMorePages(false);
        }
      } else {
        console.warn('❌ Invalid orders response:', response);
        if (reset) {
          setOrders([]);
        }
        
        // Enhanced error logging for debugging
        if (response?.message) {
          console.error('📦 Orders API error:', response.message);
          console.error('📦 Full response:', JSON.stringify(response, null, 2));
          console.error('📦 Request details - User ID:', user.id, 'Page:', page, 'Status:', selectedStatus);
          
          // Show detailed error for validation issues
          if (response.message.includes('Validation failed') && response.errors) {
            console.error('📦 Validation errors:', response.errors);
            response.errors.forEach((err, index) => {
              console.error(`📦 Validation error ${index + 1}:`, err);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      // Alert.alert(t('common.error'), t('orders.errorLoading'));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders(true);
  }, [selectedStatus]);

  const loadMoreOrders = () => {
    if (!loadingMore && hasMorePages) {
      loadOrders(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#f39c12';
      case 'confirmed':
        return '#3498db';
      case 'preparing':
        return '#9b59b6';
      case 'ready':
        return '#2ecc71';
      case 'out_for_delivery':
        return '#e67e22';
      case 'delivered':
        return '#27ae60';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'preparing':
        return 'restaurant-outline';
      case 'ready':
        return 'checkmark-done-outline';
      case 'out_for_delivery':
        return 'bicycle-outline';
      case 'delivered':
        return 'gift-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return '';
    }
  };

  const formatCurrency = (amount: any): string => {
    try {
      // Handle null, undefined, or empty values
      if (amount === null || amount === undefined || amount === '') {
        return '$0.00';
      }
      
      // Convert to number safely
      const numAmount = parseFloat(String(amount));
      
      // Check if conversion resulted in valid number
      if (isNaN(numAmount)) {
        return '$0.00';
      }
      
      return `$${numAmount.toFixed(2)}`;
    } catch (error) {
      console.warn('Error formatting currency:', error);
      return '$0.00';
    }
  };

  const renderOrderCard = ({ item: order }: { item: Order }) => {
    // Validate order data
    if (!order || typeof order !== 'object') {
      return null;
    }

    const statusColor = getStatusColor(order.order_status);
    const statusIcon = getStatusIcon(order.order_status);
    const branchName = isRTL ? (order.branch_title_ar || '') : (order.branch_title_en || '');

    // Use TouchableOpacity for authenticated users, View for guest users
    const CardComponent = isGuest ? View : TouchableOpacity;
    const cardProps = isGuest ? {} : {
      onPress: () => {
        navigation.navigate('OrderDetails', { orderId: order.id });
      }
    };

    return (
      <CardComponent
        style={[styles.orderCard, isRTL && styles.rtlOrderCard]}
        {...cardProps}
      >
        <View style={[styles.orderHeader, isRTL && styles.rtlOrderHeader]}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderNumber, isRTL && styles.rtlText]}>
              {order.order_number || ''}
            </Text>
            <Text style={[styles.orderDate, isRTL && styles.rtlText]}>
              {formatDate(order.created_at)}
            </Text>
          </View>
          
          <View style={[styles.statusContainer, { backgroundColor: statusColor + '20' }]}>
            <Icon name={statusIcon} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }, isRTL && styles.rtlText]}>
              {t(`orders.statusLabels.${order.order_status || 'pending'}`)}
            </Text>
          </View>
        </View>

        <View style={[styles.orderDetails, isRTL && styles.rtlOrderDetails]}>
          <View style={styles.orderMeta}>
            <Text style={[styles.orderMetaLabel, isRTL && styles.rtlText]}>
              {t('orders.orderType')}:
            </Text>
            <Text style={[styles.orderMetaValue, isRTL && styles.rtlText]}>
              {t(`orders.types.${order.order_type || 'delivery'}`)}
            </Text>
          </View>

          {branchName && branchName.trim() && (
            <View style={styles.orderMeta}>
              <Text style={[styles.orderMetaLabel, isRTL && styles.rtlText]}>
                {t('orders.branch')}:
              </Text>
              <Text style={[styles.orderMetaValue, isRTL && styles.rtlText]}>
                {branchName}
              </Text>
            </View>
          )}

          <View style={styles.orderMeta}>
            <Text style={[styles.orderMetaLabel, isRTL && styles.rtlText]}>
              {t('orders.items')}:
            </Text>
            <Text style={[styles.orderMetaValue, isRTL && styles.rtlText]}>
              {order.items_count || 0} {t('common.items')}
            </Text>
          </View>
        </View>

        <View style={[styles.orderFooter, isRTL && styles.rtlOrderFooter]}>
          <Text style={[styles.totalAmount, isRTL && styles.rtlText]}>
            {formatCurrency(order.total_amount)}
          </Text>
          {!isGuest && (
            <Icon name="chevron-forward" size={20} color="#666" />
          )}
        </View>
      </CardComponent>
    );
  };

  const renderStatusFilter = () => {
    return (
      <View style={styles.statusFilterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item, index) => `status-filter-${item.key || index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.statusFilterButton,
                selectedStatus === item.key && styles.activeStatusFilter
              ]}
              onPress={() => setSelectedStatus(item.key)}
            >
              <Text style={[
                styles.statusFilterText,
                selectedStatus === item.key && styles.activeStatusFilterText,
                isRTL && styles.rtlText
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.statusFilterList}
        />
      </View>
    );
  };

  const renderLoadingFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  const renderEmptyState = () => {
    const getEmptyMessage = () => {
      if (isGuest) {
        return selectedStatus 
          ? t('orders.noGuestOrdersWithStatus') || 'No guest orders with this status' 
          : t('orders.noGuestOrders') || 'No orders found. Place your first order to see it here!';
      }
      return selectedStatus ? t('orders.noOrdersWithStatus') : t('orders.noOrders');
    };

    const getSubtitle = () => {
      if (isGuest) {
        return t('orders.guestOrdersNote') || 'Your orders are stored locally on this device.';
      }
      return t('orders.startShopping');
    };

    return (
      <View style={styles.emptyContainer}>
        <Icon name="receipt-outline" size={80} color="#ccc" />
        <Text style={[styles.emptyTitle, isRTL && styles.rtlText]}>
          {getEmptyMessage()}
        </Text>
        <Text style={[styles.emptySubtitle, isRTL && styles.rtlText]}>
          {getSubtitle()}
        </Text>
        <TouchableOpacity 
          style={styles.startShoppingButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.startShoppingButtonText}>
            {t('orders.shopNow')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.rtlContainer]}>
      {renderStatusFilter()}
      
      <FlatList
        data={orders || []}
        renderItem={renderOrderCard}
        keyExtractor={(item, index) => {
          // Ensure unique key using order ID, order number, or fallback to index
          if (item?.id) return `order-${item.id}`;
          if (item?.order_number) return `order-num-${item.order_number}`;
          return `order-index-${index}`;
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreOrders}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderLoadingFooter}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={orders.length === 0 ? styles.emptyContentContainer : styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  emptyContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 15,
  },
  
  // Status Filter Styles
  statusFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusFilterList: {
    paddingHorizontal: 15,
  },
  statusFilterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeStatusFilter: {
    backgroundColor: Colors.primary,
  },
  statusFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeStatusFilterText: {
    color: '#fff',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  
  // Order Card Styles
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rtlOrderCard: {
    alignItems: 'flex-end',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rtlOrderHeader: {
    flexDirection: 'row-reverse',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderDetails: {
    marginBottom: 12,
  },
  rtlOrderDetails: {
    alignItems: 'flex-end',
  },
  orderMeta: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  orderMetaLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  orderMetaValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  rtlOrderFooter: {
    flexDirection: 'row-reverse',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  
  // Loading Footer
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  startShoppingButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startShoppingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrdersScreen;
