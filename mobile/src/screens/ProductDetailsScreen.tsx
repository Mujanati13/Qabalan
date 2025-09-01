import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageStyle,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import ApiService, { Product } from '../services/apiService';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { Typography, Spacing, BorderRadius, Shadow } from '../theme';
import Toast from '../components/common/Toast';
import EnhancedButton from '../components/common/EnhancedButton';
import HapticFeedback from '../utils/HapticFeedback';

const { width: screenWidth } = Dimensions.get('window');

interface ProductDetailsScreenProps {
  navigation: any;
  route: any;
}

const ProductDetailsScreen: React.FC<ProductDetailsScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { isRTL, currentLanguage } = useLanguage();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { productId } = route.params || {};

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Enhanced UI states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(1);
  const cartButtonScale = new Animated.Value(1);
  const [showAddedToCart, setShowAddedToCart] = useState(false);

  useEffect(() => {
    if (productId) {
      loadProduct();
    } else {
      setLoading(false);
    }
  }, [productId]);

  const parsePrice = (price: string | number | null | undefined): number => {
    if (price === null || price === undefined) return 0;
    return typeof price === 'string' ? parseFloat(price) || 0 : price;
  };

  const formatPrice = (price: string | number | null | undefined): string => {
    const numericPrice = parsePrice(price);
    return `$${numericPrice.toFixed(2)}`;
  };

  const calculateDiscountPercentage = (basePrice: string | number, salePrice: string | number): number => {
    const base = parsePrice(basePrice);
    const sale = parsePrice(salePrice);
    if (base <= 0 || sale <= 0 || sale >= base) return 0;
    return Math.round(((base - sale) / base) * 100);
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getProductById(productId);
      
      if (response.success && response.data) {
        setProduct(response.data);
        setIsFavorite(response.data.is_favorited);
      } else {
        Alert.alert('Error', 'Product not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      setAddingToCart(true);
      
      // Add item to cart using CartContext
      addToCart(product, quantity);
      
      // Enhanced success feedback
      setIsAddedToCart(true);
      setToastMessage(t('cart.itemAdded', { 
        quantity, 
        product: getProductTitle(product) 
      }) || `Added ${quantity} ${getProductTitle(product)} to cart`);
      setToastType('success');
      setShowToast(true);
      
      // Haptic feedback for success
      HapticFeedback.success();
      
      // Button scale animation
      Animated.sequence([
        Animated.timing(cartButtonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(cartButtonScale, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(cartButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset quantity after adding
      setTimeout(() => {
        setQuantity(1);
        setIsAddedToCart(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      setToastMessage(t('cart.addError') || 'Failed to add item to cart');
      setToastType('error');
      setShowToast(true);
      HapticFeedback.error();
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    
    try {
      setAddingToCart(true);
      addToCart(product, quantity);
      // Navigate to Cart tab, then to Checkout screen
      navigation.navigate('Cart', { screen: 'Checkout' });
    } catch (error) {
      console.error('Error in buy now:', error);
      setToastMessage(t('cart.addError') || 'Failed to add item to cart');
      setToastType('error');
      setShowToast(true);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!product || !user) {
      Alert.alert('Login Required', 'Please login to add favorites');
      return;
    }

    try {
      setIsFavorite(!isFavorite);
      // Add favorite toggle functionality here
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setIsFavorite(!isFavorite); // Revert on error
    }
  };

  const getProductTitle = (product: Product) => {
    return currentLanguage === 'ar' ? (product.title_ar || product.title_en) : product.title_en;
  };

  const getProductDescription = (product: Product) => {
    return currentLanguage === 'ar' ? (product.description_ar || product.description_en) : product.description_en;
  };

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
    HapticFeedback.light();
  };

  const decrementQuantity = () => {
    setQuantity(prev => prev > 1 ? prev - 1 : 1);
    HapticFeedback.light();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasDiscount = product.sale_price && parsePrice(product.sale_price) > 0 && parsePrice(product.sale_price) < parsePrice(product.base_price);
  const discountPercentage = hasDiscount ? calculateDiscountPercentage(product.base_price, product.sale_price!) : 0;
  const finalPrice = hasDiscount ? parsePrice(product.sale_price!) : parsePrice(product.base_price);

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.rtlContainer]}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.rtlHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="#333" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.rtlText]} numberOfLines={1}>
          {getProductTitle(product)}
        </Text>
        <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerButton}>
          <Icon 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorite ? Colors.error : "#333"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: product.main_image ? ApiService.getImageUrl(product.main_image) : 'https://via.placeholder.com/400x300?text=No+Image' 
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {product.is_featured && (
            <View style={styles.featuredBadge}>
              <Icon name="star" size={16} color={Colors.textWhite} />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {discountPercentage}% {t('common.off')}
              </Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.productTitle, isRTL && styles.rtlText]}>
            {getProductTitle(product)}
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {formatPrice(finalPrice)}
            </Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {formatPrice(product.base_price)}
              </Text>
            )}
          </View>

          <View style={styles.stockContainer}>
            <View style={[
              styles.stockIndicator,
              { backgroundColor: product.stock_status === 'in_stock' ? Colors.success : Colors.error }
            ]} />
            <Text style={styles.stockText}>
              {product.stock_status === 'in_stock' ? t('products.inStock') : t('products.outOfStock')}
            </Text>
          </View>

          {getProductDescription(product) && (
            <View style={styles.descriptionContainer}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                {t('products.description')}
              </Text>
              <Text style={[styles.description, isRTL && styles.rtlText]}>
                {getProductDescription(product)}
              </Text>
            </View>
          )}

          <View style={styles.detailsContainer}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              {t('products.details')}
            </Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SKU:</Text>
              <Text style={styles.detailValue}>{product.sku}</Text>
            </View>
            {product.category_title_en && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('products.category')}:</Text>
                <Text style={styles.detailValue}>
                  {currentLanguage === 'ar' ? (product.category_title_ar || product.category_title_en) : product.category_title_en}
                </Text>
              </View>
            )}
            {product.loyalty_points > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('loyalty.points')}:</Text>
                <Text style={styles.detailValue}>{product.loyalty_points} {t('loyalty.pointsEarned')}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Bottom Actions */}
      {product.stock_status === 'in_stock' && (
        <View style={styles.bottomActions}>
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>{t('cart.quantity')}:</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity onPress={decrementQuantity} style={styles.quantityButton}>
                <Icon name="remove" size={16} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity onPress={incrementQuantity} style={styles.quantityButton}>
                <Icon name="add" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            {/* Buy Now Button */}
            <EnhancedButton
              title={t('products.buyNow') || 'Buy Now'}
              subtitle={formatPrice(finalPrice * quantity)}
              onPress={handleBuyNow}
              loading={addingToCart}
              loadingText={t('cart.addingToCart') || 'Adding...'}
              variant="secondary"
              size="medium"
              icon="flash"
              style={styles.buyNowButton}
            />
            
            {/* Add to Cart Button */}
            <Animated.View style={[{ transform: [{ scale: cartButtonScale }] }, styles.addToCartContainer]}>
              <EnhancedButton
                title={isAddedToCart ? (t('cart.added') || 'Added!') : (t('cart.addToCart') || 'Add to Cart')}
                subtitle={isAddedToCart ? undefined : formatPrice(finalPrice * quantity)}
                onPress={handleAddToCart}
                loading={addingToCart}
                loadingText={t('cart.addingToCart') || 'Adding...'}
                variant={isAddedToCart ? 'success' : 'primary'}
                size="medium"
                icon={isAddedToCart ? 'checkmark-circle' : 'bag-add'}
                disabled={isAddedToCart}
                style={styles.addToCartButtonEnhanced}
              />
            </Animated.View>
          </View>
        </View>
      )}
      
      {/* Out of Stock Message */}
      {product.stock_status !== 'in_stock' && (
        <View style={styles.outOfStockContainer}>
          <Icon name="alert-circle-outline" size={20} color="#dc3545" />
          <Text style={styles.outOfStockText}>
            {t('products.outOfStock') || 'Out of Stock'}
          </Text>
        </View>
      )}
      
      {/* Enhanced Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  rtlContainer: {
    direction: 'rtl',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  backButtonText: {
    color: Colors.textWhite,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    ...Shadow.sm,
  },
  rtlHeader: {
    flexDirection: 'row-reverse',
  },
  headerButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: screenWidth,
    height: screenWidth * 0.75,
    backgroundColor: Colors.backgroundLight,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  } as ImageStyle,
  featuredBadge: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    backgroundColor: Colors.star,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textWhite,
    marginLeft: Spacing.xs,
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  discountText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textWhite,
  },
  infoContainer: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    marginTop: -BorderRadius.lg,
    minHeight: screenWidth,
  },
  productTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.lg,
    marginBottom: Spacing.md,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  currentPrice: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  originalPrice: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textHint,
    textDecorationLine: 'line-through',
    marginLeft: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stockIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  stockText: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  descriptionContainer: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.xl,
  },
  detailsContainer: {
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  detailValue: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  bottomActions: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Shadow.lg,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  buyNowButton: {
    flex: 1,
  },
  addToCartContainer: {
    flex: 1,
  },
  addToCartButtonEnhanced: {
    flex: 1,
  },
  outOfStockContainer: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    color: '#dc3545',
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.sm,
  },
  quantityLabel: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  quantityText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginHorizontal: Spacing.lg,
    minWidth: 30,
    textAlign: 'center',
  },
  addToCartButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.base,
  },
  disabledButton: {
    backgroundColor: Colors.textHint,
  },
  addToCartText: {
    color: Colors.textWhite,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginLeft: Spacing.sm,
  },
  // Legacy styles to maintain compatibility
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 18,
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  successMessage: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});

export default ProductDetailsScreen;
