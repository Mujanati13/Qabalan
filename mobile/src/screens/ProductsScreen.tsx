import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import ApiService, { Product } from '../services/apiService';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { Typography, Spacing, BorderRadius, Shadow } from '../theme';

interface ProductsScreenProps {
  navigation: any;
  route: any;
}

const ProductsScreen: React.FC<ProductsScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { isRTL, currentLanguage } = useLanguage();
  const { featured, categoryId, categoryName } = route.params || {};

  console.log('📱 ProductsScreen mounted with params:', { featured, categoryId, categoryName });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 ProductsScreen useEffect triggered');
    loadProducts();
  }, []);

  const parsePrice = (price: string | number | null | undefined): number => {
    if (price === null || price === undefined) return 0;
    return typeof price === 'string' ? parseFloat(price) || 0 : price;
  };

  const loadProducts = async (pageNumber = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
        setError(null);
      }

      const params: any = {
        page: pageNumber,
        limit: 10,
        sort: 'sort_order',
        order: 'asc'
      };

      if (featured) {
        params.is_featured = true;
      } else if (categoryId) {
        params.category_id = categoryId;
      }

      console.log('🔍 Loading products with params:', params);
      const response = await ApiService.getProducts(params);
      console.log('📦 Products API response:', {
        success: response.success,
        dataLength: response.data?.length || 0,
        message: response.message
      });

      if (response.success && response.data) {
        const newProducts = response.data || [];  // response.data is the products array
        console.log('✅ Received products:', newProducts.length);
        console.log('📄 Pagination data:', response.pagination);
        
        if (append) {
          setProducts(prev => [...prev, ...newProducts]);
        } else {
          setProducts(newProducts);
        }

        // Check if there are more products - pagination is at the top level
        const hasMoreData = response.pagination?.hasNext ?? false;
        setHasMore(hasMoreData);
        setPage(pageNumber);
      } else {
        const errorMsg = response.message || 'Failed to load products';
        console.error('❌ Failed to load products:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred';
      console.error('💥 Error loading products:', error);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts(1, false);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadProducts(page + 1, true);
    }
  };

  const getProductTitle = (product: Product) => {
    return currentLanguage === 'ar' ? (product.title_ar || product.title_en) : product.title_en;
  };

  const getProductDescription = (product: Product) => {
    return currentLanguage === 'ar' ? (product.description_ar || product.description_en) : product.description_en;
  };

  const getProductPrice = (product: Product) => {
    const salePrice = parsePrice(product.sale_price);
    const basePrice = parsePrice(product.base_price);
    const price = salePrice > 0 ? salePrice : basePrice;
    return `$${price.toFixed(2)}`;
  };

  const getOriginalPrice = (product: Product) => {
    const salePrice = parsePrice(product.sale_price);
    const basePrice = parsePrice(product.base_price);
    
    if (salePrice > 0 && salePrice < basePrice) {
      return `$${basePrice.toFixed(2)}`;
    }
    return null;
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
    >
      {item.main_image ? (
        <Image 
          source={{ uri: ApiService.getImageUrl(item.main_image) }} 
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Icon name="image-outline" size={40} color="#ccc" />
        </View>
      )}
      
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {getProductTitle(item)}
        </Text>
        
        <Text style={styles.productDescription} numberOfLines={2}>
          {getProductDescription(item)}
        </Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>
            {getProductPrice(item)}
          </Text>
          {getOriginalPrice(item) && (
            <Text style={styles.originalPrice}>
              {getOriginalPrice(item)}
            </Text>
          )}
        </View>
        
        {item.is_featured && (
          <View style={styles.featuredBadge}>
            <Icon name="star" size={12} color="#FFD700" />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        
        <View style={styles.stockContainer}>
          <View style={[
            styles.stockIndicator,
            { backgroundColor: item.stock_status === 'in_stock' ? '#27ae60' : '#e74c3c' }
          ]} />
          <Text style={styles.stockText}>
            {item.stock_status === 'in_stock' ? 'In Stock' : 'Out of Stock'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="basket-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Products Found</Text>
      <Text style={styles.emptyMessage}>
        {error 
          ? `Error: ${error}`
          : featured 
          ? 'No featured products available at the moment.'
          : categoryId 
          ? 'No products available in this category.'
          : 'No products available at the moment.'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => loadProducts()}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
      <Text style={styles.debugText}>
        Debug: Products count: {products.length} | Error: {error || 'None'}
      </Text>
    </View>
  );

  const getScreenTitle = () => {
    if (featured) {
      return t('home.featuredProducts') || 'Featured Products';
    } else if (categoryName) {
      return categoryName;
    } else {
      return t('products.products') || 'Products';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {getScreenTitle()}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  rtlHeader: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  productsList: {
    padding: 10,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  featuredText: {
    fontSize: 10,
    color: '#856404',
    marginLeft: 4,
    fontWeight: '600',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockText: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    marginLeft: 0,
    marginRight: 15,
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
});

export default ProductsScreen;
