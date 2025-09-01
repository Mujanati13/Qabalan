import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService, { Order, OrderItem, OrderStatusHistory } from '../services/apiService';
import Icon from 'react-native-vector-icons/Ionicons';

interface OrderDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      orderId: number;
    };
  };
}

const OrderDetailsScreen: React.FC<any> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      
      const orderResponse = await ApiService.getOrderDetails(orderId);

      if (orderResponse.success && orderResponse.data) {
        setOrder(orderResponse.data.order);
        
        // Set status history from the order details response
        if (orderResponse.data.status_history) {
          setStatusHistory(orderResponse.data.status_history);
        }
      } else {
        Alert.alert(t('common.error'), orderResponse.message);
        navigation.goBack();
        return;
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      Alert.alert(t('common.error'), t('orders.errorLoadingDetails'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const confirmReceipt = async () => {
    if (!order) return;

    Alert.alert(
      t('orders.confirmReceipt'),
      t('orders.confirmReceiptMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              setConfirmingReceipt(true);
              const response = await ApiService.confirmOrderReceipt(order.id);
              
              if (response.success) {
                Alert.alert(t('common.success'), t('orders.receiptConfirmed'));
                loadOrderDetails(); // Refresh order details
              } else {
                Alert.alert(t('common.error'), response.message);
              }
            } catch (error) {
              console.error('Error confirming receipt:', error);
              Alert.alert(t('common.error'), t('orders.errorConfirmingReceipt'));
            } finally {
              setConfirmingReceipt(false);
            }
          },
        },
      ]
    );
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
      case 'receipt_confirmed':
        return '#1abc9c';
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
      case 'receipt_confirmed':
        return 'thumbs-up-outline';
      default:
        return 'ellipse-outline';
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrderItem = (item: OrderItem) => {
    const productName = isRTL ? item.product_title_ar : item.product_title_en;
    const variantName = item.variant_title_ar && item.variant_title_en
      ? (isRTL ? item.variant_title_ar : item.variant_title_en)
      : null;

    return (
      <View key={item.id} style={[styles.orderItem, isRTL && styles.rtlOrderItem]}>
        {item.product_image && (
          <Image 
            source={{ uri: item.product_image }} 
            style={styles.productImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.itemDetails}>
          <Text style={[styles.productName, isRTL && styles.rtlText]}>
            {productName}
          </Text>
          
          {variantName && (
            <Text style={[styles.variantName, isRTL && styles.rtlText]}>
              {variantName}
            </Text>
          )}
          
          {item.special_instructions && (
            <Text style={[styles.specialInstructions, isRTL && styles.rtlText]}>
              {t('orders.specialInstructions')}: {item.special_instructions}
            </Text>
          )}
          
          <View style={[styles.itemPricing, isRTL && styles.rtlItemPricing]}>
            <Text style={[styles.quantity, isRTL && styles.rtlText]}>
              {t('orders.quantity')}: {item.quantity}
            </Text>
            <Text style={[styles.unitPrice, isRTL && styles.rtlText]}>
              {formatCurrency(item.unit_price)} {t('orders.each')}
            </Text>
          </View>
        </View>
        
        <View style={styles.itemTotal}>
          <Text style={[styles.itemTotalPrice, isRTL && styles.rtlText]}>
            {formatCurrency(item.total_price)}
          </Text>
        </View>
      </View>
    );
  };

  const renderStatusHistory = () => {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
          {t('orders.statusHistory')}
        </Text>
        
        {statusHistory.map((status, index) => {
          const statusColor = getStatusColor(status.status);
          const statusIcon = getStatusIcon(status.status);
          const isLast = index === statusHistory.length - 1;
          
          return (
            <View key={status.id} style={[styles.statusItem, isRTL && styles.rtlStatusItem]}>
              <View style={styles.statusIndicator}>
                <View style={[styles.statusIcon, { backgroundColor: statusColor }]}>
                  <Icon name={statusIcon} size={16} color="#fff" />
                </View>
                {!isLast && <View style={styles.statusLine} />}
              </View>
              
              <View style={styles.statusContent}>
                <Text style={[styles.statusTitle, isRTL && styles.rtlText]}>
                  {t(`orders.statusLabels.${status.status}`)}
                </Text>
                
                <Text style={[styles.statusDate, isRTL && styles.rtlText]}>
                  {formatDate(status.created_at)}
                </Text>
                
                {status.note && (
                  <Text style={[styles.statusNote, isRTL && styles.rtlText]}>
                    {status.note}
                  </Text>
                )}
                
                {status.first_name && status.last_name && (
                  <Text style={[styles.statusBy, isRTL && styles.rtlText]}>
                    {t('orders.updatedBy')}: {status.first_name} {status.last_name}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('orders.orderNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getStatusColor(order.order_status);
  const statusIcon = getStatusIcon(order.order_status);
  const branchName = isRTL ? order.branch_title_ar : order.branch_title_en;
  const canConfirmReceipt = order.order_status === 'delivered' && 
    !statusHistory.some(h => h.status === 'receipt_confirmed');

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.rtlContainer]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <View style={styles.section}>
          <View style={[styles.orderHeader, isRTL && styles.rtlOrderHeader]}>
            <View style={styles.orderInfo}>
              <Text style={[styles.orderNumber, isRTL && styles.rtlText]}>
                {order.order_number}
              </Text>
              <Text style={[styles.orderDate, isRTL && styles.rtlText]}>
                {formatDate(order.created_at)}
              </Text>
            </View>
            
            <View style={[styles.statusContainer, { backgroundColor: statusColor + '20' }]}>
              <Icon name={statusIcon} size={20} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }, isRTL && styles.rtlText]}>
                {t(`orders.statusLabels.${order.order_status}`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('orders.orderDetails')}
          </Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>
                {t('orders.orderType')}:
              </Text>
              <Text style={[styles.detailValue, isRTL && styles.rtlText]}>
                {t(`orders.types.${order.order_type}`)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>
                {t('orders.paymentMethod')}:
              </Text>
              <Text style={[styles.detailValue, isRTL && styles.rtlText]}>
                {t(`orders.paymentMethods.${order.payment_method}`)}
              </Text>
            </View>
            
            {branchName && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>
                  {t('orders.branch')}:
                </Text>
                <Text style={[styles.detailValue, isRTL && styles.rtlText]}>
                  {branchName}
                </Text>
              </View>
            )}
            
            {order.estimated_delivery_time && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>
                  {t('orders.estimatedDelivery')}:
                </Text>
                <Text style={[styles.detailValue, isRTL && styles.rtlText]}>
                  {formatDate(order.estimated_delivery_time)}
                </Text>
              </View>
            )}
            
            {order.delivered_at && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>
                  {t('orders.deliveredAt')}:
                </Text>
                <Text style={[styles.detailValue, isRTL && styles.rtlText]}>
                  {formatDate(order.delivered_at)}
                </Text>
              </View>
            )}
            
            {order.promo_code && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>
                  {t('orders.promoCode')}:
                </Text>
                <Text style={[styles.detailValue, styles.promoCode, isRTL && styles.rtlText]}>
                  {order.promo_code}
                </Text>
              </View>
            )}
          </View>
          
          {order.special_instructions && (
            <View style={styles.specialInstructionsContainer}>
              <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>
                {t('orders.specialInstructions')}:
              </Text>
              <Text style={[styles.specialInstructionsText, isRTL && styles.rtlText]}>
                {order.special_instructions}
              </Text>
            </View>
          )}
        </View>

        {/* Order Items */}
        {order.order_items && order.order_items.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('orders.orderItems')}
            </Text>
            
            {order.order_items.map(renderOrderItem)}
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t('orders.orderSummary')}
          </Text>
          
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
              <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
                {t('orders.subtotal')}:
              </Text>
              <Text style={[styles.summaryValue, isRTL && styles.rtlText]}>
                {formatCurrency(order.subtotal)}
              </Text>
            </View>
            
            {(Number(order.delivery_fee) || 0) > 0 && (
              <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
                <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
                  {t('orders.deliveryFee')}:
                </Text>
                <Text style={[styles.summaryValue, isRTL && styles.rtlText]}>
                  {formatCurrency(order.delivery_fee)}
                </Text>
              </View>
            )}
            
            {(Number(order.tax_amount) || 0) > 0 && (
              <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
                <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
                  {t('orders.tax')}:
                </Text>
                <Text style={[styles.summaryValue, isRTL && styles.rtlText]}>
                  {formatCurrency(order.tax_amount)}
                </Text>
              </View>
            )}
            
            {(Number(order.discount_amount) || 0) > 0 && (
              <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
                <Text style={[styles.summaryLabel, styles.discountLabel, isRTL && styles.rtlText]}>
                  {t('orders.discount')}:
                </Text>
                <Text style={[styles.summaryValue, styles.discountValue, isRTL && styles.rtlText]}>
                  -{formatCurrency(order.discount_amount).substring(1)}
                </Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.totalRow, isRTL && styles.rtlSummaryRow]}>
              <Text style={[styles.totalLabel, isRTL && styles.rtlText]}>
                {t('orders.total')}:
              </Text>
              <Text style={[styles.totalValue, isRTL && styles.rtlText]}>
                {formatCurrency(order.total_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Status History */}
        {renderStatusHistory()}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        {/* Support Ticket Button */}
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => navigation.navigate('CreateTicket', { orderId: order?.id })}
        >
          <Icon name="headset" size={20} color="#666" />
          <Text style={styles.supportButtonText}>
            Need Help?
          </Text>
        </TouchableOpacity>

        {/* Confirm Receipt Button */}
        {canConfirmReceipt && (
          <TouchableOpacity
            style={[styles.confirmReceiptButton, confirmingReceipt && styles.disabledButton]}
            onPress={confirmReceipt}
            disabled={confirmingReceipt}
          >
            {confirmingReceipt ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.confirmReceiptText}>
                  {t('orders.confirmReceipt')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  
  // Section Styles
  section: {
    backgroundColor: '#fff',
    marginVertical: 5,
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  
  // Order Header Styles
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rtlOrderHeader: {
    flexDirection: 'row-reverse',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Details Styles
  detailsGrid: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  promoCode: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  specialInstructionsContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  specialInstructionsText: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
    lineHeight: 20,
  },
  
  // Order Items Styles
  orderItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rtlOrderItem: {
    flexDirection: 'row-reverse',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  variantName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  specialInstructions: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  itemPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rtlItemPricing: {
    flexDirection: 'row-reverse',
  },
  quantity: {
    fontSize: 14,
    color: '#666',
  },
  unitPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  itemTotalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  
  // Summary Styles
  summaryContainer: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#333',
    fontWeight: '500',
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
  
  // Status History Styles
  statusItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  rtlStatusItem: {
    flexDirection: 'row-reverse',
  },
  statusIndicator: {
    alignItems: 'center',
    marginRight: 15,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 8,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusNote: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  statusBy: {
    fontSize: 12,
    color: '#999',
  },
  
  // Bottom Action Styles
  bottomContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  supportButton: {
    backgroundColor: '#f8f9fa',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  supportButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  confirmReceiptButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  confirmReceiptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default OrderDetailsScreen;
