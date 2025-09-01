import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { Typography, Spacing, BorderRadius, Shadow } from '../theme';

const { width } = Dimensions.get('window');

interface CartScreenProps {
  navigation: any;
}

const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user, isGuest } = useAuth();
  const { items, itemCount, totalAmount, updateQuantity, removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [deliveryFee] = useState(5.99);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const AnimatedCartItem = ({ item, index }: { item: any; index: number }) => {
    const itemFadeAnim = useRef(new Animated.Value(1)).current;
    const itemSlideAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const animateQuantityChange = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const animateRemove = () => {
      Animated.parallel([
        Animated.timing(itemFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(itemSlideAnim, {
          toValue: isRTL ? width : -width,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const handleRemove = () => {
      const itemKey = `${item.product_id}-${item.variant_id || 'default'}`;
      setAnimatingItems(prev => new Set([...prev, itemKey]));
      animateRemove();
      setTimeout(() => {
        removeFromCart(item.product_id, item.variant_id);
        setAnimatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      }, 300);
    };

    const handleQuantityChange = (newQuantity: number) => {
      if (newQuantity < 1) {
        handleRemove();
        return;
      }
      animateQuantityChange();
      updateQuantity(item.product_id, newQuantity, item.variant_id);
    };

    const product = item.product;
    if (!product) return null;

    const title = isRTL ? product.title_ar : product.title_en;
    const hasDiscount = product.sale_price && product.sale_price < product.base_price;
    const price = parseFloat(product.final_price?.toString() || product.sale_price?.toString() || product.base_price?.toString() || '0');
    const originalPrice = parseFloat(product.base_price?.toString() || '0');
    const itemTotal = price * item.quantity;

    return (
      <Animated.View 
        style={[
          styles.cartItem,
          {
            opacity: itemFadeAnim,
            transform: [
              { translateX: itemSlideAnim },
              { scale: scaleAnim },
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                })
              }
            ],
          }
        ]}
      >
        <View style={styles.cartItemContent}>
          <View style={styles.imageContainer}>
            <Image
              source={{ 
                uri: product.main_image || 'https://via.placeholder.com/80x80?text=No+Image' 
              }}
              style={styles.productImage}
              resizeMode="cover"
            />
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round(((originalPrice - price) / originalPrice) * 100)}%
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text style={[styles.productTitle, isRTL && styles.rtlText]} numberOfLines={2}>
              {title}
            </Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>
                ${price.toFixed(2)}
              </Text>
              {hasDiscount && (
                <Text style={styles.originalPrice}>
                  ${originalPrice.toFixed(2)}
                </Text>
              )}
            </View>

            {item.special_instructions && (
              <Text style={[styles.specialInstructions, isRTL && styles.rtlText]} numberOfLines={2}>
                {t('cart.specialInstructions')}: {item.special_instructions}
              </Text>
            )}

            <View style={styles.quantityAndTotal}>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={[styles.quantityButton, styles.decreaseButton]}
                  onPress={() => handleQuantityChange(item.quantity - 1)}
                  disabled={loading}
                >
                  <Icon name="remove" size={16} color="#fff" />
                </TouchableOpacity>
                
                <Animated.View style={[styles.quantityContainer, { transform: [{ scale: scaleAnim }] }]}>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                </Animated.View>
                
                <TouchableOpacity
                  style={[styles.quantityButton, styles.increaseButton]}
                  onPress={() => handleQuantityChange(item.quantity + 1)}
                  disabled={loading}
                >
                  <Icon name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.itemTotalContainer}>
                <Text style={styles.itemTotal}>
                  ${itemTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemove}
            disabled={loading}
          >
            <Icon name="trash-outline" size={22} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const calculateDiscount = () => {
    return 0; // No promo code discount in cart
  };

  const discount = calculateDiscount();
  const finalTotal = Math.max(totalAmount + deliveryFee, 0);

  const handleQuantityChange = (productId: number, newQuantity: number, variantId?: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId, variantId);
      return;
    }
    updateQuantity(productId, newQuantity, variantId);
  };

  const handleRemoveItem = (productId: number, variantId?: number) => {
    Alert.alert(
      t('cart.removeItem'),
      t('cart.removeItemConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: () => removeFromCart(productId, variantId)
        }
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      t('cart.clearCart'),
      t('cart.clearCartConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.confirm'), 
          style: 'destructive',
          onPress: () => {
            clearCart();
          }
        }
      ]
    );
  };

  const handleCheckout = () => {
    if (!user && !isGuest) {
      Alert.alert(
        t('auth.loginRequired'),
        t('auth.loginRequiredMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('auth.login'), 
            onPress: () => navigation.navigate('Auth', { screen: 'Login' })
          }
        ]
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert(t('cart.empty'), t('cart.addItemsFirst'));
      return;
    }

    // Navigate to checkout
    navigation.navigate('Checkout');
  };

  const renderCartItem = (item: any, index: number) => {
    return <AnimatedCartItem item={item} index={index} />;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.rtlContainer]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={[styles.headerContent, isRTL && styles.rtlHeader]}>
          <Text style={[styles.title, isRTL && styles.rtlText]}>
            {t('cart.title')} ({itemCount})
          </Text>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClearCart} disabled={loading}>
              <Text style={[styles.clearButton, isRTL && styles.rtlText]}>
                {t('cart.clearCart')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {items.length === 0 ? (
        <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
          <Icon name="basket-outline" size={100} color="#ddd" />
          <Text style={[styles.emptyTitle, isRTL && styles.rtlText]}>
            {t('cart.empty')}
          </Text>
          <Text style={[styles.emptySubtitle, isRTL && styles.rtlText]}>
            {t('cart.addItemsFirst')}
          </Text>
          <TouchableOpacity 
            style={styles.continueShoppingButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.continueShoppingText}>
              {t('cart.continueShopping')}
            </Text>
            <Icon name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.itemsContainer, { opacity: fadeAnim }]}>
              {items.map((item, index) => (
                <View key={`cart-item-${item.product_id}-${item.variant_id || 'default'}-${index}`}>
                  {renderCartItem(item, index)}
                </View>
              ))}
            </Animated.View>
          </ScrollView>

          <Animated.View style={[styles.bottomContainer, { 
            opacity: fadeAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              })
            }]
          }]}>
            <View style={styles.summaryContainer}>
              <Text style={[styles.summaryTitle, isRTL && styles.rtlText]}>
                {t('cart.orderSummary')}
              </Text>
              
              <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
                <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
                  {t('cart.subtotal')}
                </Text>
                <Text style={[styles.summaryValue, isRTL && styles.rtlText]}>
                  ${totalAmount.toFixed(2)}
                </Text>
              </View>
              
              <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
                <Text style={[styles.summaryLabel, isRTL && styles.rtlText]}>
                  {t('cart.deliveryFee')}
                </Text>
                <Text style={[styles.summaryValue, isRTL && styles.rtlText]}>
                  {deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : t('cart.free')}
                </Text>
              </View>

              <View style={styles.divider} />
              
              <View style={[styles.summaryRow, isRTL && styles.rtlSummaryRow]}>
                <Text style={[styles.totalLabel, isRTL && styles.rtlText]}>
                  {t('cart.total')}
                </Text>
                <Text style={[styles.totalValue, isRTL && styles.rtlText]}>
                  ${finalTotal.toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.checkoutButton, loading && styles.disabledButton]}
              onPress={handleCheckout}
              disabled={loading || items.length === 0}
            >
              <View style={styles.checkoutButtonContent}>
                <Text style={styles.checkoutButtonText}>
                  {t('cart.checkout')}
                </Text>
                <Text style={styles.checkoutButtonPrice}>
                  ${finalTotal.toFixed(2)}
                </Text>
              </View>
              <Icon name={isRTL ? "chevron-back" : "chevron-forward"} size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </>
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
    backgroundColor: '#fff',
    paddingBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  rtlHeader: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  clearButton: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#f8f9fa',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  continueShoppingButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
  },
  continueShoppingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  itemsContainer: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cartItemContent: {
    flexDirection: 'row',
    padding: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  discountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff6b6b',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  specialInstructions: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  quantityAndTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 2,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decreaseButton: {
    backgroundColor: '#ff6b6b',
  },
  increaseButton: {
    backgroundColor: '#007AFF',
  },
  quantityContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    minWidth: 24,
    textAlign: 'center',
  },
  itemTotalContainer: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  removeButton: {
    padding: 12,
    alignSelf: 'flex-start',
  },
  summaryContainer: {
    marginBottom: 12,
  },
  bottomContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
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
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  checkoutButtonContent: {
    flex: 1,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  checkoutButtonPrice: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.9,
  },
});

export default CartScreen;
