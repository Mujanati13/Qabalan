import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';
import supportService, { SupportTicket } from '../services/supportService';
import { useAuth } from '../contexts/AuthContext';

interface FilterOptions {
  status: string;
  category: string;
}

const SupportTicketsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Get route params for notification handling
  const params = route.params as any;
  const notificationTicketId = params?.ticketId;
  const shouldRefresh = params?.refresh;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    category: '',
  });

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'inquiry', label: 'Inquiry' },
    { value: 'order_issue', label: 'Order Issue' },
  ];

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [filters])
  );

  const fetchTickets = async () => {
    try {
      setLoading(true);
      console.log('🎫 SupportTicketsScreen: Fetching tickets with filters:', filters);
      
      const filterParams = {
        ...(filters.status && { status: filters.status }),
        ...(filters.category && { category: filters.category }),
        page: 1,
        limit: 50,
      };

      console.log('📋 Filter params:', filterParams);
      const response = await supportService.getMyTickets(filterParams);
      console.log('✅ Received tickets response:', response);
      console.log('🎫 Number of tickets:', response.tickets.length);
      
      setTickets(response.tickets);
      
      if (response.tickets.length === 0) {
        console.log('⚠️  No tickets found for user');
      }
    } catch (error) {
      console.error('❌ Error fetching tickets:', error);
      Alert.alert('Error', 'Failed to fetch tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  // Handle notification navigation
  useEffect(() => {
    if (notificationTicketId) {
      // Find the ticket and navigate to it
      const ticket = tickets.find(t => t.id === notificationTicketId);
      if (ticket) {
        // Small delay to ensure the screen is mounted
        setTimeout(() => {
          navigateToTicketDetails(ticket);
        }, 500);
      } else if (shouldRefresh) {
        // If ticket not found, refresh the list
        fetchTickets();
      }
    }
  }, [notificationTicketId, tickets, shouldRefresh]);

  const getStatusColor = (status: string): string => {
    return supportService.getStatusColor(status);
  };

  const getPriorityColor = (priority: string): string => {
    return supportService.getPriorityColor(priority);
  };

  const getCategoryIcon = (category: string): string => {
    return supportService.getCategoryIcon(category);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUnreadRepliesCount = (ticket: SupportTicket): number => {
    if (!ticket.replies) return 0;
    return ticket.replies.filter(reply => 
      reply.admin_id && !reply.is_internal_note
    ).length;
  };

  const navigateToTicketDetails = (ticket: SupportTicket) => {
    (navigation as any).navigate('TicketDetails', { ticketId: ticket.id });
  };

  const navigateToCreateTicket = () => {
    (navigation as any).navigate('CreateTicket');
  };

  const renderTicketItem = ({ item }: { item: SupportTicket }) => {
    const unreadCount = getUnreadRepliesCount(item);
    
    return (
      <TouchableOpacity
        style={styles.ticketItem}
        onPress={() => navigateToTicketDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketInfo}>
            <View style={styles.ticketTitleRow}>
              <Icon
                name={getCategoryIcon(item.category)}
                size={16}
                color="#666"
                style={styles.categoryIcon}
              />
              <Text style={styles.ticketNumber}>#{item.ticket_number}</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.ticketSubject} numberOfLines={2}>
              {item.subject}
            </Text>
          </View>
          <View style={styles.ticketMeta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ticketContent}>
          <Text style={styles.ticketMessage} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        <View style={styles.ticketFooter}>
          <View style={styles.ticketDetails}>
            {item.order && (
              <View style={styles.orderInfo}>
                <Icon name="shopping-cart" size={12} color="#666" />
                <Text style={styles.orderText}>Order #{item.order.order_number}</Text>
              </View>
            )}
            <Text style={styles.ticketDate}>{formatDate(item.created_at)}</Text>
          </View>
          
          <View style={styles.ticketActions}>
            {item.replies && item.replies.length > 0 && (
              <View style={styles.repliesInfo}>
                <Icon name="chatbubbles" size={16} color="#666" />
                <Text style={styles.repliesCount}>{item.replies.length}</Text>
              </View>
            )}
            <Icon name="chevron-forward" size={16} color="#ccc" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Support Tickets</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={navigateToCreateTicket}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.filterButtons}>
              {statusOptions.slice(0, 3).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterButton,
                    filters.status === option.value && styles.activeFilterButton,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, status: option.value }))}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filters.status === option.value && styles.activeFilterButtonText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Category:</Text>
            <View style={styles.filterButtons}>
              {categoryOptions.slice(0, 3).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterButton,
                    filters.category === option.value && styles.activeFilterButton,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, category: option.value }))}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filters.category === option.value && styles.activeFilterButtonText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="headset" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No support tickets yet</Text>
      <Text style={styles.emptyText}>
        Create your first support ticket to get help from our team
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={navigateToCreateTicket}
      >
        <Icon name="add" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>Create Ticket</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Loading tickets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        renderItem={renderTicketItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1890ff']}
            tintColor="#1890ff"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tickets.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#1890ff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    gap: 8,
  },
  filterRow: {
    marginBottom: 8,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
    minWidth: 60,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  activeFilterButton: {
    backgroundColor: '#1890ff',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  ticketItem: {
    backgroundColor: '#fff',
    margin: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryIcon: {
    marginRight: 6,
  },
  ticketNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1890ff',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#ff4d4f',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 22,
  },
  ticketMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '600',
  },
  ticketContent: {
    marginBottom: 12,
  },
  ticketMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDetails: {
    flex: 1,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  ticketDate: {
    fontSize: 12,
    color: '#999',
  },
  ticketActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repliesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  repliesCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1890ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default SupportTicketsScreen;
