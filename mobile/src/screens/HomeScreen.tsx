import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  ImageStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import ApiService, { Category, Product } from '../services/apiService';
import notificationService from '../services/notificationService';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { Button, Card, SearchBar } from '../components/common';

const { width: screenWidth } = Dimensions.get('window');
const BANNER_WIDTH = screenWidth - 40;
const BANNER_HEIGHT = BANNER_WIDTH * 0.42; // slightly shorter banner

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { unreadCount } = useNotification();

  const [banners, setBanners] = useState<Category[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      const [bannersRes, categoriesRes, featuredRes, topRes, recentRes] = await Promise.all([
        ApiService.getBannerCategories(),
        ApiService.getTopCategories(8),
        ApiService.getFeaturedProducts(6),
        ApiService.getProducts({ limit: 6, sort: 'sort_order', order: 'asc' }),
        ApiService.getProducts({ limit: 6, sort: 'created_at', order: 'desc' }),
      ]);

      if (bannersRes.success && bannersRes.data && Array.isArray(bannersRes.data)) {
        setBanners(bannersRes.data);
      } else {
        setBanners([]);
      }

      if (categoriesRes.success && categoriesRes.data && Array.isArray(categoriesRes.data)) {
        setCategories(categoriesRes.data);
      } else {
        setCategories([]);
      }

      if (featuredRes.success && featuredRes.data && Array.isArray(featuredRes.data)) {
        setFeaturedProducts(featuredRes.data);
      } else {
        setFeaturedProducts([]);
      }

      if (topRes.success && topRes.data && Array.isArray(topRes.data)) {
        setTopProducts(topRes.data);
      } else {
        setTopProducts([]);
      }

      if (recentRes.success && recentRes.data && Array.isArray(recentRes.data)) {
        setRecentProducts(recentRes.data);
      } else {
        setRecentProducts([]);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
      // Reset arrays to empty on error to prevent undefined length errors
      setBanners([]);
      setCategories([]);
      setFeaturedProducts([]);
      setTopProducts([]);
      setRecentProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const parsePrice = (price: string | number | null | undefined): number => {
    if (price === null || price === undefined) return 0;
    return typeof price === 'string' ? parseFloat(price) || 0 : price;
  };

  const calculateDiscountPercentage = (basePrice: string | number, salePrice: string | number): number => {
    const base = parsePrice(basePrice);
    const sale = parsePrice(salePrice);
    if (base <= 0 || sale <= 0 || sale >= base) return 0;
    return Math.round(((base - sale) / base) * 100);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await ApiService.getProducts({
        search: query.trim(),
        limit: 20,
      });

      if (response.success && response.data && Array.isArray(response.data)) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const renderBannerItem = ({ item, index }: { item: Category; index: number }) => {
    if (!item || typeof item !== 'object') return null;
    
    const bannerImage = item.banner_mobile || item.banner_image || item.image;
    const title = isRTL ? (item.title_ar || '') : (item.title_en || '');

    return (
      <TouchableOpacity
        style={styles.bannerContainer}
        onPress={() => navigation.navigate('Products', { 
          categoryId: item.id, 
          categoryName: title || 'Category'
        })}
      >
        {bannerImage && !failedImages.has(`banner-${item.id}`) ? (
          <Image
            source={{ uri: bannerImage }}
            style={styles.bannerImage}
            resizeMode="cover"
            onError={() => {
              setFailedImages(prev => new Set(prev).add(`banner-${item.id}`));
            }}
          />
        ) : (
          <View style={[styles.bannerImage, styles.bannerIconFallback]}>
            <Icon name="image-outline" size={60} color={Colors.primary} />
          </View>
        )}
        <View style={styles.bannerOverlay}>
          <Text style={[styles.bannerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {title || t('common.category')}
          </Text>
          {(item.description_ar || item.description_en) ? (
            <Text style={[styles.bannerDescription, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isRTL ? (item.description_ar || '') : (item.description_en || '')}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    if (!item || typeof item !== 'object') return null;
    
    const title = isRTL ? (item.title_ar || '') : (item.title_en || '');
    
    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => navigation.navigate('Products', { 
          categoryId: item.id, 
          categoryName: title || 'Category'
        })}
      >
        <View style={styles.categoryImageContainer}>
          {item.image && !failedImages.has(`category-${item.id}`) ? (
            <Image
              source={{ uri: item.image }}
              style={styles.categoryImage}
              resizeMode="cover"
              onError={() => {
                setFailedImages(prev => new Set(prev).add(`category-${item.id}`));
              }}
            />
          ) : (
            <View style={[styles.categoryImage, styles.categoryIconFallback]}>
              <Icon name="grid-outline" size={40} color={Colors.primary} />
            </View>
          )}
        </View>
        <Text style={[styles.categoryText, { textAlign: 'center' }]} numberOfLines={2}>
          {title || t('common.category')}
        </Text>
        {(item.products_count && item.products_count > 0) && (
          <Text style={styles.productCount}>
            {item.products_count || 0} {t('common.items')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    if (!item || typeof item !== 'object') return null;
    
    const title = isRTL ? (item.title_ar || '') : (item.title_en || '');
    const hasDiscount = item.sale_price && item.sale_price < item.base_price;
    const isOutOfStock = item.stock_status === 'out_of_stock';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
        disabled={isOutOfStock}
      >
        <View style={styles.productItem}>
          <View style={styles.productImageContainer}>
            {item.main_image && !failedImages.has(`product-${item.id}`) ? (
              <Image
                source={{ uri: ApiService.getImageUrl(item.main_image) }}
                style={styles.productImage}
                resizeMode="cover"
                onError={() => {
                  setFailedImages(prev => new Set(prev).add(`product-${item.id}`));
                }}
              />
            ) : (
              <View style={[styles.productImage, styles.productIconFallback]}>
                <Icon name="cube-outline" size={50} color={Colors.primary} />
              </View>
            )}
            {item.is_featured && !isOutOfStock && (
              <View style={styles.featuredBadge}>
                <Icon name="star" size={12} color={Colors.textWhite} />
              </View>
            )}
            {hasDiscount && !isOutOfStock && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {calculateDiscountPercentage(item.base_price || 0, item.sale_price || 0)}% {t('common.off')}
                </Text>
              </View>
            )}
            {isOutOfStock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockBadgeText}>{t('products.outOfStock')}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {title || t('common.product')}
            </Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>
                ${typeof item.final_price === 'string' ? 
                  parseFloat(item.final_price || '0').toFixed(2) : 
                  (item.final_price || 0).toFixed(2)}
              </Text>
              {hasDiscount && !isOutOfStock && (
                <Text style={styles.originalPrice}>
                  ${typeof item.base_price === 'string' ? 
                    parseFloat(item.base_price || '0').toFixed(2) : 
                    (item.base_price || 0).toFixed(2)}
                </Text>
              )}
            </View>

            {/* Quick Add Button for In-Stock Items */}
            {!isOutOfStock && (
              <TouchableOpacity 
                style={styles.quickAddButton}
                onPress={() => {
                  navigation.navigate('ProductDetails', { productId: item.id });
                }}
              >
                <Icon name="add" size={16} color={Colors.textWhite} />
                <Text style={styles.quickAddText}>{t('products.quickAdd') || 'Add'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isRTL && styles.rtlContainer]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Modern Enhanced Header */}
        <View style={[styles.modernHeader, isRTL && styles.rtlModernHeader]}>
          {/* App Title and Actions */}
          <View style={[styles.headerTop, isRTL && styles.rtlHeaderTop]}>
            <View style={styles.appTitleSection}>
              <Text style={[styles.appTitle, isRTL && styles.rtlText]}>Qablan</Text>
              <Text style={[styles.appSubtitle, isRTL && styles.rtlText]}>
                {t('home.freshAndFast') || 'Fresh & Fast Delivery'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Icon name="notifications" size={24} color={Colors.textPrimary} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount.toString()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Icon name="person-circle" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Search Section */}
          <View style={styles.modernSearchSection}>
            <SearchBar
              placeholder={t('home.searchProducts')}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>

        {/* Enhanced Search Results */}
        {searchQuery.trim().length > 0 && (
          <View style={styles.modernSearchResultsSection}>
            <View style={[styles.modernSectionHeader, isRTL && styles.rtlModernSectionHeader]}>
              <View>
                <Text style={[styles.modernSectionTitle, isRTL && styles.rtlText]}>
                  {t('home.searchResults')} "{searchQuery}"
                </Text>
                <Text style={[styles.modernSectionSubtitle, isRTL && styles.rtlText]}>
                  {isSearching 
                    ? t('common.searching') 
                    : searchResults.length > 0 
                      ? `${searchResults.length} ${t('common.itemsFound')}` 
                      : t('home.noSearchResults')
                  }
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modernClearButton}
                onPress={clearSearch}
              >
                <Icon name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {isSearching ? (
              <View style={styles.modernSearchLoadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.modernSearchLoadingText}>{t('common.searching')}</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults || []}
                renderItem={renderProductItem}
                keyExtractor={(item, index) => item?.id?.toString() || `search-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modernProductsList}
              />
            ) : (
              <View style={styles.modernNoResultsContainer}>
                <Icon name="search-outline" size={48} color={Colors.borderLight} />
                <Text style={[styles.modernNoResultsText, isRTL && styles.rtlText]}>
                  {t('home.noSearchResults')}
                </Text>
                <Text style={[styles.modernNoResultsSubtext, isRTL && styles.rtlText]}>
                  {t('home.tryDifferentKeywords') || 'Try different keywords or browse categories'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Modern Banner Slider */}
        {(banners && banners.length > 0) && (
          <View style={styles.modernBannerSection}>
            <Text style={[styles.modernSectionTitle, isRTL && styles.rtlText]}>
              {t('home.featuredOffers') || 'Featured Offers'}
            </Text>
            <FlatList
              data={banners || []}
              renderItem={renderBannerItem}
              keyExtractor={(item, index) => item?.id?.toString() || `banner-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={BANNER_WIDTH + 20}
              decelerationRate="fast"
              contentContainerStyle={styles.modernBannerList}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / (BANNER_WIDTH + 20));
                setCurrentBannerIndex(newIndex);
              }}
            />
            {banners.length > 1 && (
              <View style={styles.modernBannerDots}>
                {banners.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.modernDot,
                      index === currentBannerIndex && styles.modernActiveDot
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Modern Categories Section */}
        {(categories && categories.length > 0) && (
          <View style={styles.modernSection}>
            <View style={[styles.modernSectionHeader, isRTL && styles.rtlModernSectionHeader]}>
              <View>
                <Text style={[styles.modernSectionTitle, isRTL && styles.rtlText]}>
                  {t('home.shopByCategory') || 'Shop by Category'}
                </Text>
                <Text style={[styles.modernSectionSubtitle, isRTL && styles.rtlText]}>
                  {t('home.exploreCategories') || 'Explore our product categories'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modernViewAllButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={[styles.modernViewAllText, isRTL && styles.rtlText]}>
                  {t('home.viewAll') || 'View All'}
                </Text>
                <Icon 
                  name={isRTL ? "chevron-back" : "chevron-forward"} 
                  size={16} 
                  color={Colors.primary} 
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={categories || []}
              renderItem={renderCategoryItem}
              keyExtractor={(item, index) => item?.id?.toString() || `category-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modernCategoriesList}
            />
          </View>
        )}

        {/* Top Products Section */}
        {(topProducts && topProducts.length > 0) && (
          <View style={styles.modernSection}>
            <View style={[styles.modernSectionHeader, isRTL && styles.rtlModernSectionHeader]}>
              <View>
                <Text style={[styles.modernSectionTitle, isRTL && styles.rtlText]}>
                  {t('home.topProducts') || 'Top Products'}
                </Text>
                <Text style={[styles.modernSectionSubtitle, isRTL && styles.rtlText]}>
                  {t('home.topProductsDesc') || 'Best selling products you\'ll love'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modernViewAllButton}
                onPress={() => navigation.navigate('Products', { sort: 'sort_order', order: 'asc' })}
              >
                <Text style={[styles.modernViewAllText, isRTL && styles.rtlText]}>
                  {t('home.viewAll') || 'View All'}
                </Text>
                <Icon 
                  name={isRTL ? "chevron-back" : "chevron-forward"} 
                  size={16} 
                  color={Colors.primary} 
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={topProducts || []}
              renderItem={renderProductItem}
              keyExtractor={(item, index) => item?.id?.toString() || `top-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modernProductsList}
            />
          </View>
        )}

        {/* Modern Featured Products Section */}
        {(featuredProducts && featuredProducts.length > 0) && (
          <View style={styles.modernSection}>
            <View style={[styles.modernSectionHeader, isRTL && styles.rtlModernSectionHeader]}>
              <View>
                <Text style={[styles.modernSectionTitle, isRTL && styles.rtlText]}>
                  {t('home.recommendedForYou') || 'Recommended for You'}
                </Text>
                <Text style={[styles.modernSectionSubtitle, isRTL && styles.rtlText]}>
                  {t('home.featuredProductsDesc') || 'Handpicked products just for you'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modernViewAllButton}
                onPress={() => navigation.navigate('Products', { featured: true })}
              >
                <Text style={[styles.modernViewAllText, isRTL && styles.rtlText]}>
                  {t('home.viewAll') || 'View All'}
                </Text>
                <Icon 
                  name={isRTL ? "chevron-back" : "chevron-forward"} 
                  size={16} 
                  color={Colors.primary} 
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={featuredProducts || []}
              renderItem={renderProductItem}
              keyExtractor={(item, index) => item?.id?.toString() || `featured-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modernProductsList}
            />
          </View>
        )}

        {/* Modern Recent Products Section */}
        {(recentProducts && recentProducts.length > 0) && (
          <View style={styles.modernSection}>
            <View style={[styles.modernSectionHeader, isRTL && styles.rtlModernSectionHeader]}>
              <View>
                <Text style={[styles.modernSectionTitle, isRTL && styles.rtlText]}>
                  {t('home.newArrivals') || 'New Arrivals'}
                </Text>
                <Text style={[styles.modernSectionSubtitle, isRTL && styles.rtlText]}>
                  {t('home.latestProducts') || 'Fresh products just added'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modernViewAllButton}
                onPress={() => navigation.navigate('Products')}
              >
                <Text style={[styles.modernViewAllText, isRTL && styles.rtlText]}>
                  {t('home.viewAll') || 'View All'}
                </Text>
                <Icon 
                  name={isRTL ? "chevron-back" : "chevron-forward"} 
                  size={16} 
                  color={Colors.primary} 
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={recentProducts || []}
              renderItem={renderProductItem}
              keyExtractor={(item, index) => item?.id?.toString() || `recent-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modernProductsList}
            />
          </View>
        )}

        {/* Empty State with Better UX */}
        {!loading && !searchQuery && banners.length === 0 && categories.length === 0 && featuredProducts.length === 0 && topProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="storefront-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>{t('home.noDataAvailable')}</Text>
            <Text style={styles.emptySubtext}>
              {t('home.pullToRefresh') || 'Pull down to refresh and check for new content'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadHomeData}>
              <Text style={styles.retryText}>{t('common.refresh')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Small Sections Loading States */}
        {loading && (
          <View style={styles.sectionsLoadingContainer}>
            {[1, 2, 3].map(index => (
              <View key={index} style={styles.sectionLoadingSkeleton}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonItems}>
                  {[1, 2, 3].map(itemIndex => (
                    <View key={itemIndex} style={styles.skeletonItem} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingBottom: Spacing['3xl'],
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
  // Header Styles
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  rtlHeader: {
    alignItems: 'flex-end',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  rtlHeaderTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  appTitleSection: {
    flex: 1,
  },
  appTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  appSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontFamily: Typography.fontFamily.regular,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.bold,
  },
  subWelcomeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  notificationButton: {
    position: 'relative',
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundCard,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textWhite,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
  },
  
  // Modern Header Styles
  modernHeader: {
    backgroundColor: Colors.backgroundCard,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    ...Shadow.md,
  },
  rtlModernHeader: {
    direction: 'rtl',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  modernSearchSection: {
    marginTop: Spacing.md,
  },
  
  // Modern Quick Actions Styles
  quickActionsContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  rtlQuickActionsContainer: {
    direction: 'rtl',
  },
  quickActionsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.bold,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  rtlQuickActionsGrid: {
    flexDirection: 'row-reverse',
  },
  modernQuickActionCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: (screenWidth - 48) / 2 - 6, // 2 columns with proper spacing
    marginBottom: Spacing.sm,
    alignItems: 'center',
    ...Shadow.sm,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.bold,
  },
  actionSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
  
  // Modern Section Styles
  modernSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  modernSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  rtlModernSectionHeader: {
    flexDirection: 'row-reverse',
  },
  modernSectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  modernSectionSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  modernViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBackground,
  },
  modernViewAllText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
    marginRight: Spacing.xs,
  },
  
  // Modern Banner Styles
  modernBannerSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  modernBannerList: {
    paddingLeft: 0,
  },
  modernBannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  modernDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.xs,
  },
  modernActiveDot: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  
  // Modern Categories List
  modernCategoriesList: {
    paddingLeft: 0,
  },
  
  // Modern Products List
  modernProductsList: {
    paddingLeft: 0,
  },
  
  // Modern Search Results Styles
  modernSearchResultsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.backgroundCard,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  modernClearButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundLight,
  },
  modernSearchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  modernSearchLoadingText: {
    marginLeft: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  modernNoResultsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  modernNoResultsText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  modernNoResultsSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  rtlQuickActions: {
    flexDirection: 'row-reverse',
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryBackground,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  quickActionText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Banner Styles
  bannerSection: {
    marginVertical: Spacing.md,
  },
  bannerList: {
    paddingHorizontal: Spacing.sm,
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundCard,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  } as ImageStyle,
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: Spacing.lg,
  },
  bannerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textWhite,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.bold,
  },
  bannerDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textWhite,
    opacity: 0.9,
    fontFamily: Typography.fontFamily.regular,
  },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.xs,
  },
  activeDot: {
    backgroundColor: Colors.primary,
    width: 24,
  },

  // Section Styles
  section: {
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  rtlSectionHeader: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.bold,
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBackground,
  },  // Categories Styles
  categoriesList: {
    paddingHorizontal: Spacing.sm,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
    width: 80,
  },
  categoryImageContainer: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.backgroundCard,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  } as ImageStyle,
  categoryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.medium,
  },
  productCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontFamily: Typography.fontFamily.regular,
  },

  // Products Styles
  productsList: {
    paddingHorizontal: Spacing.sm,
  },
  productItem: {
    width: 150,
    marginHorizontal: Spacing.sm,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  } as ImageStyle,
  featuredBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.star,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  discountText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textWhite,
    fontFamily: Typography.fontFamily.bold,
  },
  productInfo: {
    padding: Spacing.md,
  },
  productTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    minHeight: 32,
    fontFamily: Typography.fontFamily.medium,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  currentPrice: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  originalPrice: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textHint,
    textDecorationLine: 'line-through',
    marginLeft: Spacing.xs,
    fontFamily: Typography.fontFamily.regular,
  },
  outOfStock: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textWhite,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.bold,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  quickAddText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textWhite,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.xs,
    fontFamily: Typography.fontFamily.medium,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['6xl'],
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  emptyText: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textHint,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
  sectionsLoadingContainer: {
    paddingHorizontal: Spacing.lg,
  },
  sectionLoadingSkeleton: {
    marginBottom: Spacing.xl,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    width: '40%',
  },
  skeletonItems: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  skeletonItem: {
    width: 140,
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: BorderRadius.md,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  retryText: {
    color: Colors.textWhite,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.medium,
  },
  
  // Search styles
  searchSection: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
  },
  clearSearchText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  searchLoadingText: {
    marginLeft: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noResultsText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.md,
    textAlign: 'center',
  },
  
  // Fallback icon styles
  categoryIconFallback: {
    backgroundColor: Colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productIconFallback: {
    backgroundColor: Colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerIconFallback: {
    backgroundColor: Colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
