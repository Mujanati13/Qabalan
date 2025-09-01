import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/Ionicons';
import apiService, { UserLoyaltyPoints, PointTransaction, PaginatedResponse } from '../services/apiService';
import { analyzeError, checkNetworkConnectivity } from '../utils/networkErrorHandler';

interface LoyaltyPointsScreenProps {
  navigation: any;
}

type FilterType = 'all' | 'earned' | 'redeemed' | 'expired' | 'bonus';

const LoyaltyPointsScreen: React.FC<LoyaltyPointsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  
  const [loyaltyPoints, setLoyaltyPoints] = useState<UserLoyaltyPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [networkError, setNetworkError] = useState(false);
  const [serverError, setServerError] = useState(false);

  const filters = [
    { key: 'all' as FilterType, label: t('common.all') },
    { key: 'earned' as FilterType, label: t('profile.pointsEarned') },
    { key: 'redeemed' as FilterType, label: t('profile.pointsRedeemed') },
    { key: 'expired' as FilterType, label: t('profile.pointsExpired') },
    { key: 'bonus' as FilterType, label: t('profile.pointsBonus') },
  ];

  // Helper function to show appropriate error message
  const showErrorMessage = (error: any, customMessage?: string) => {
    const errorInfo = analyzeError(error);
    let title = t('common.error');
    let message = customMessage || errorInfo.message;

    if (errorInfo.isNetworkError || errorInfo.isTimeoutError) {
      setNetworkError(true);
      title = t('common.connectionError');
      message = t('common.checkInternetConnection');
    } else if (errorInfo.isServerError) {
      setServerError(true);
      title = t('common.serverError');
      message = t('common.serverTemporarilyUnavailable');
    }

    Alert.alert(title, message, [
      {
        text: t('common.tryAgain'),
        onPress: async () => {
          setNetworkError(false);
          setServerError(false);
          
          // Check connectivity before retrying
          const isConnected = await checkNetworkConnectivity();
          if (!isConnected) {
            Alert.alert(
              t('common.noInternetConnection'),
              t('common.pleaseCheckConnection')
            );
            return;
          }
          
          loadData();
        }
      },
      {
        text: t('common.cancel'),
        style: 'cancel',
        onPress: () => {
          setNetworkError(false);
          setServerError(false);
        }
      }
    ]);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reset transactions when filter changes
    setTransactions([]);
    setCurrentPage(1);
    setHasMorePages(true);
    loadTransactions(1, activeFilter);
  }, [activeFilter]);

  const loadData = async () => {
    setLoading(true);
    setNetworkError(false);
    setServerError(false);
    
    try {
      await Promise.all([
        loadLoyaltyPoints(),
        loadTransactions(1, activeFilter)
      ]);
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      showErrorMessage(error, t('loyalty.failedToLoadData'));
    } finally {
      setLoading(false);
    }
  };

  const loadLoyaltyPoints = async () => {
    try {
      const response = await apiService.getUserLoyaltyPoints();
      if (response && response.success && response.data) {
        setLoyaltyPoints(response.data);
        setNetworkError(false);
        setServerError(false);
      } else {
        // Handle case where response is successful but no data
        console.warn('No loyalty points data received');
      }
    } catch (error) {
      console.error('Error loading loyalty points:', error);
      showErrorMessage(error, t('loyalty.failedToLoadPoints'));
    }
  };

  const loadTransactions = async (page: number = 1, filter: FilterType = 'all') => {
    try {
      const params: any = { page, limit: 20 };
      if (filter !== 'all') {
        params.type = filter;
      }

      const response = await apiService.getPointTransactions(params);
      
      if (response && response.success && response.data) {
        const newTransactions = response.data.data || [];
        
        if (page === 1) {
          setTransactions(newTransactions);
        } else {
          setTransactions(prev => [...prev, ...newTransactions]);
        }

        // Safe access to pagination data with fallbacks
        const pagination = response.data.pagination || {};
        const currentPageFromResponse = pagination.page || page;
        const totalPages = pagination.pages || 1;
        
        setHasMorePages(currentPageFromResponse < totalPages);
        setCurrentPage(page);
        setNetworkError(false);
        setServerError(false);
      } else {
        // Handle case where response is not successful
        console.warn('Failed to load transactions:', response?.message || 'Unknown error');
        if (page === 1) {
          // Only show error for first page, not for load more
          showErrorMessage(new Error(response?.message || 'Failed to load transactions'));
        }
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      
      // Only show error alert for first page load, not for pagination
      if (page === 1) {
        showErrorMessage(error, t('loyalty.failedToLoadTransactions'));
      } else {
        // For pagination errors, just log and stop loading more
        setLoadingMore(false);
        setHasMorePages(false);
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNetworkError(false);
    setServerError(false);
    setCurrentPage(1);
    setHasMorePages(true);
    
    try {
      await loadData();
    } catch (error) {
      console.error('Error refreshing data:', error);
      showErrorMessage(error, t('loyalty.failedToRefresh'));
    } finally {
      setRefreshing(false);
    }
  }, [activeFilter]);

  const loadMore = async () => {
    if (loadingMore || !hasMorePages || networkError || serverError) return;
    
    setLoadingMore(true);
    try {
      await loadTransactions(currentPage + 1, activeFilter);
    } catch (error) {
      console.error('Error loading more transactions:', error);
      // Don't show alert for load more errors, just stop loading
      setHasMorePages(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned': return 'add-circle';
      case 'redeemed': return 'remove-circle';
      case 'expired': return 'time';
      case 'bonus': return 'gift';
      default: return 'star';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned': return '#4CAF50';
      case 'redeemed': return '#FF9800';
      case 'expired': return '#F44336';
      case 'bonus': return '#9C27B0';
      default: return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderTransaction = ({ item }: { item: PointTransaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: getTransactionColor(item.type) + '20' }
        ]}>
          <Icon 
            name={getTransactionIcon(item.type)} 
            size={20} 
            color={getTransactionColor(item.type)} 
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {isRTL ? item.description_ar : item.description_en}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.created_at)}
          </Text>
          {item.expires_at && (
            <Text style={styles.transactionExpiry}>
              {t('profile.pointsExpireOn')} {formatDate(item.expires_at)}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionPoints,
          { color: getTransactionColor(item.type) }
        ]}>
          {item.type === 'redeemed' ? '-' : '+'}{Math.abs(item.points)}
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Error state for network issues
  if (networkError && !loyaltyPoints && transactions.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="cloud-offline" size={64} color="#ccc" />
        <Text style={styles.errorTitle}>{t('common.connectionError')}</Text>
        <Text style={styles.errorMessage}>{t('common.checkInternetConnection')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Error state for server issues
  if (serverError && !loyaltyPoints && transactions.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="server" size={64} color="#ccc" />
        <Text style={styles.errorTitle}>{t('common.serverError')}</Text>
        <Text style={styles.errorMessage}>{t('common.serverTemporarilyUnavailable')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Network Error Banner */}
      {(networkError || serverError) && loyaltyPoints && (
        <View style={styles.errorBanner}>
          <Icon 
            name={networkError ? "cloud-offline" : "server"} 
            size={16} 
            color="#fff" 
            style={styles.errorBannerIcon} 
          />
          <Text style={styles.errorBannerText}>
            {networkError 
              ? t('common.connectionIssues') 
              : t('common.serverIssues')
            }
          </Text>
          <TouchableOpacity onPress={loadData} style={styles.errorBannerButton}>
            <Text style={styles.errorBannerButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Points Summary */}
      {loyaltyPoints && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Icon name="star" size={32} color="#FFD700" />
            <Text style={styles.summaryTitle}>{t('profile.loyaltyPoints')}</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{loyaltyPoints.available_points}</Text>
              <Text style={styles.statLabel}>{t('profile.availablePoints')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{loyaltyPoints.total_points}</Text>
              <Text style={styles.statLabel}>{t('profile.totalPoints')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{loyaltyPoints.lifetime_earned}</Text>
              <Text style={styles.statLabel}>{t('profile.lifetimeEarned')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{loyaltyPoints.lifetime_redeemed}</Text>
              <Text style={styles.statLabel}>{t('profile.lifetimeRedeemed')}</Text>
            </View>
          </View>
          
          <Text style={styles.earnMessage}>
            {t('profile.earnPointsMessage')}
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && styles.filterTabActive
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text style={[
              styles.filterTabText,
              activeFilter === filter.key && styles.filterTabTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Transactions List */}
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
        style={styles.transactionsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="star-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>{t('profile.noPointsHistory')}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stat: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  earnMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  transactionItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
  },
  transactionExpiry: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionPoints: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorBannerIcon: {
    marginRight: 8,
  },
  errorBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorBannerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  errorBannerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoyaltyPointsScreen;
