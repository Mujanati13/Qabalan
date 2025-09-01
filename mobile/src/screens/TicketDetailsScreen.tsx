import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Linking,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';
// import DocumentPicker from '@react-native-documents/picker';
import { launchImageLibrary, MediaType, PhotoQuality } from 'react-native-image-picker';
import supportService, { SupportTicket, SupportReply } from '../services/supportService';
import { useAuth } from '../contexts/AuthContext';

interface AttachmentFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

type RootStackParamList = {
  TicketDetails: {
    ticketId: number;
  };
};

type TicketDetailsRouteProp = RouteProp<RootStackParamList, 'TicketDetails'>;

const TicketDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<TicketDetailsRouteProp>();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<AttachmentFile[]>([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [hasUnreadReplies, setHasUnreadReplies] = useState(false);

  const { ticketId } = route.params;

  useFocusEffect(
    useCallback(() => {
      fetchTicketDetails();
    }, [ticketId])
  );

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      console.log('🎫 Fetching ticket details for ticket ID:', ticketId);
      const ticketData = await supportService.getTicketDetails(ticketId);
      setTicket(ticketData);
      console.log('✅ Ticket details loaded successfully');
      
      // Try to mark ticket as read (non-critical operation)
      try {
        await supportService.markTicketAsRead(ticketId);
        setHasUnreadReplies(false);
        console.log('✅ Ticket marked as read');
      } catch (markReadError) {
        // Mark-as-read is not critical, so we don't fail the whole operation
        console.log('⚠️  Could not mark ticket as read, but continuing:', markReadError);
      }
      
      // Show rating modal if ticket is resolved and not rated yet
      if (ticketData.status === 'resolved' && !ticketData.rating) {
        setShowRating(true);
      }
    } catch (error) {
      console.error('❌ Error fetching ticket details:', error);
      Alert.alert('Error', 'Failed to fetch ticket details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTicketDetails();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSendingReply(true);

    try {
      await supportService.addReply(ticketId, replyMessage.trim(), replyAttachments);
      setReplyMessage('');
      setReplyAttachments([]);
      await fetchTicketDetails(); // Refresh ticket data
      Alert.alert('Success', 'Your reply has been sent successfully. Support staff will be notified.');
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Error', 'Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      await supportService.rateTicket(ticketId, rating, ratingFeedback);
      setShowRating(false);
      await fetchTicketDetails(); // Refresh to show rating
      Alert.alert('Thank you', 'Your feedback has been submitted successfully');
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  const pickDocument = async () => {
    try {
      // DocumentPicker functionality temporarily disabled due to compatibility issues
      Alert.alert('Info', 'Document picker is temporarily unavailable. Please use image picker instead.');
      return;
      
      // const result = await DocumentPicker.pick({
      //   type: [DocumentPicker.types.allFiles],
      //   allowMultiSelection: true,
      // });

      // const newFiles = result.map(file => ({
      //   uri: file.uri,
      //   name: file.name || 'document',
      //   type: file.type || 'application/octet-stream',
      //   size: file.size || undefined,
      // }));

      // setReplyAttachments(prev => [...prev, ...newFiles]);
    } catch (error) {
      // if (!DocumentPicker.isCancel(error)) {
        console.error('Error picking document:', error);
        Alert.alert('Error', 'Failed to pick document');
      // }
    }
  };

  const pickImage = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as PhotoQuality,
      allowsEditing: true,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        const newFile: AttachmentFile = {
          uri: asset.uri!,
          name: asset.fileName || 'image.jpg',
          type: asset.type || 'image/jpeg',
          size: asset.fileSize,
        };

        setReplyAttachments(prev => [...prev, newFile]);
      }
    });
  };

  const removeAttachment = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): string => {
    return supportService.getStatusColor(status);
  };

  const getPriorityColor = (priority: string): string => {
    return supportService.getPriorityColor(priority);
  };

  const getCategoryIcon = (category: string): string => {
    return supportService.getCategoryIcon(category);
  };

  const openAttachment = (attachment: any) => {
    // In a real app, you would implement proper file viewing/downloading
    Alert.alert(
      'Attachment',
      `Name: ${attachment.file_name}\nSize: ${supportService.formatFileSize(attachment.file_size)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: () => {
          // Implement download logic here
          Alert.alert('Info', 'Download functionality would be implemented here');
        }},
      ]
    );
  };

  const renderReply = ({ item }: { item: SupportReply }) => {
    const isCustomerReply = !!item.user_id;
    const isCurrentUser = item.user_id === user?.id;

    return (
      <View style={[
        styles.replyItem,
        isCustomerReply ? styles.customerReply : styles.adminReply,
        isCurrentUser && styles.currentUserReply,
      ]}>
        <View style={styles.replyHeader}>
          <View style={styles.replyAuthor}>
            <Icon
              name={isCustomerReply ? 'person' : 'headset'}
              size={16}
              color={isCustomerReply ? '#1890ff' : '#52c41a'}
            />
            <Text style={[
              styles.replyAuthorName,
              { color: isCustomerReply ? '#1890ff' : '#52c41a' }
            ]}>
              {isCustomerReply 
                ? (isCurrentUser ? 'You' : `${item.user?.first_name} ${item.user?.last_name}`)
                : 'Support Team'
              }
            </Text>
          </View>
          <Text style={styles.replyDate}>{formatDate(item.created_at)}</Text>
        </View>
        
        <Text style={styles.replyMessage}>{item.message}</Text>
        
        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.replyAttachments}>
            {item.attachments.map((attachment, index) => (
              <TouchableOpacity
                key={index}
                style={styles.attachmentItem}
                onPress={() => openAttachment(attachment)}
              >
                <Icon name="document" size={16} color="#666" />
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.file_name}
                </Text>
                <Icon name="download" size={14} color="#1890ff" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderStars = (currentRating: number, onPress?: (rating: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress?.(star)}
            disabled={!onPress}
          >
            <Icon
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={32}
              color={star <= currentRating ? '#faad14' : '#ccc'}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderAttachment = ({ item, index }: { item: AttachmentFile; index: number }) => (
    <View style={styles.replyAttachmentItem}>
      <Icon name="document" size={16} color="#666" />
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentFileName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.size && (
          <Text style={styles.attachmentFileSize}>
            {supportService.formatFileSize(item.size)}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.removeAttachmentBtn}
        onPress={() => removeAttachment(index)}
      >
        <Icon name="close-circle" size={20} color="#ff4d4f" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Loading ticket...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color="#ff4d4f" />
        <Text style={styles.errorText}>Ticket not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>#{ticket.ticket_number}</Text>
          <Text style={styles.headerSubtitle}>{ticket.subject}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1890ff']}
            tintColor="#1890ff"
            title="Pull to refresh conversation"
          />
        }
      >
        {/* Ticket Info */}
        <View style={styles.ticketInfo}>
          <View style={styles.ticketMeta}>
            <View style={styles.metaRow}>
              <Icon name={getCategoryIcon(ticket.category)} size={20} color="#666" />
              <Text style={styles.metaLabel}>Category:</Text>
              <Text style={styles.metaValue}>
                {ticket.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
            
            <View style={styles.metaRow}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                  {ticket.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) + '20' }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(ticket.priority) }]}>
                  {ticket.priority.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {ticket.order && (
            <View style={styles.orderInfo}>
              <Icon name="shopping-cart" size={16} color="#666" />
              <Text style={styles.orderText}>
                Related Order: #{ticket.order.order_number} (${ticket.order.total_amount.toFixed(2)})
              </Text>
            </View>
          )}

          <View style={styles.ticketMessage}>
            <Text style={styles.originalMessage}>{ticket.message}</Text>
          </View>

          <Text style={styles.ticketDate}>Created: {formatDate(ticket.created_at)}</Text>

          {ticket.rating && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Your Rating:</Text>
              {renderStars(ticket.rating)}
            </View>
          )}
        </View>

        {/* Replies */}
        {ticket.replies && ticket.replies.length > 0 && (
          <View style={styles.repliesSection}>
            <Text style={styles.repliesTitle}>Conversation</Text>
            <FlatList
              data={ticket.replies}
              renderItem={renderReply}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Reply Section - Only show if ticket is not closed */}
      {ticket.status !== 'closed' && (
        <View style={styles.replySection}>
          {/* Conversation status indicator */}
          <View style={styles.conversationStatus}>
            <Icon 
              name="chatbubbles-outline" 
              size={16} 
              color={ticket.status === 'resolved' ? '#52c41a' : '#1890ff'} 
            />
            <Text style={[styles.conversationStatusText, {
              color: ticket.status === 'resolved' ? '#52c41a' : '#1890ff'
            }]}>
              {ticket.status === 'resolved' 
                ? 'Conversation resolved - You can still add comments' 
                : 'Support team will respond soon'}
            </Text>
          </View>

          {replyAttachments.length > 0 && (
            <FlatList
              data={replyAttachments}
              renderItem={renderAttachment}
              keyExtractor={(item, index) => index.toString()}
              style={styles.replyAttachmentsList}
              scrollEnabled={false}
            />
          )}

            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                value={replyMessage}
                onChangeText={setReplyMessage}
                placeholder="Add a comment or note about your order..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              
              {/* Character counter */}
              <Text style={styles.characterCounter}>
                {replyMessage.length}/500
              </Text>
              
              <View style={styles.replyInputRow}>
                <View style={styles.replyActions}>
                  <TouchableOpacity
                    style={styles.attachmentActionButton}
                    onPress={pickDocument}
                  >
                    <Icon name="document" size={20} color="#666" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.attachmentActionButton}
                    onPress={pickImage}
                  >
                    <Icon name="camera" size={20} color="#666" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.sendButton, 
                      (sendingReply || !replyMessage.trim()) && styles.sendButtonDisabled
                    ]}
                    onPress={handleSendReply}
                    disabled={sendingReply || !replyMessage.trim()}
                  >
                    {sendingReply ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon name="send" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        </View>
      )}

      {/* Rating Modal */}
      <Modal
        visible={showRating}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRating(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModal}>
            <Text style={styles.ratingModalTitle}>Rate Our Support</Text>
            <Text style={styles.ratingModalSubtitle}>
              How satisfied are you with the support you received?
            </Text>
            
            {renderStars(rating, setRating)}
            
            <TextInput
              style={styles.ratingFeedbackInput}
              value={ratingFeedback}
              onChangeText={setRatingFeedback}
              placeholder="Additional feedback (optional)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.ratingModalActions}>
              <TouchableOpacity
                style={styles.ratingCancelButton}
                onPress={() => setShowRating(false)}
              >
                <Text style={styles.ratingCancelText}>Skip</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.ratingSubmitButton, rating === 0 && styles.ratingSubmitButtonDisabled]}
                onPress={handleRating}
                disabled={rating === 0}
              >
                <Text style={styles.ratingSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1890ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerBackButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1890ff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  ticketInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketMeta: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  metaLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  orderText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  ticketMessage: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  originalMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  ticketDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  ratingSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  repliesSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  repliesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  replyItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  customerReply: {
    backgroundColor: '#f0f9ff',
    borderLeftColor: '#1890ff',
  },
  adminReply: {
    backgroundColor: '#f6ffed',
    borderLeftColor: '#52c41a',
  },
  currentUserReply: {
    backgroundColor: '#e6f7ff',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  replyDate: {
    fontSize: 12,
    color: '#999',
  },
  replyMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  replyAttachments: {
    marginTop: 12,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  attachmentName: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    marginRight: 6,
  },
  replySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  conversationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginBottom: 12,
  },
  conversationStatusText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  characterCounter: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
  },
  replyAttachmentsList: {
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  replyAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 8,
  },
  attachmentFileName: {
    fontSize: 12,
    color: '#333',
  },
  attachmentFileSize: {
    fontSize: 10,
    color: '#666',
  },
  removeAttachmentBtn: {
    padding: 4,
  },
  replyInputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  replyInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentActionButton: {
    padding: 8,
    marginRight: 4,
  },
  sendButton: {
    backgroundColor: '#1890ff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingModal: {
    backgroundColor: '#fff',
    margin: 32,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  ratingModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ratingModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  star: {
    marginHorizontal: 4,
  },
  ratingFeedbackInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 24,
    minHeight: 80,
  },
  ratingModalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  ratingCancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  ratingCancelText: {
    fontSize: 16,
    color: '#666',
  },
  ratingSubmitButton: {
    flex: 1,
    backgroundColor: '#1890ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  ratingSubmitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  ratingSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default TicketDetailsScreen;
