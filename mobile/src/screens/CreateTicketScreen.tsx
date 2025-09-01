import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';
// import DocumentPicker from '@react-native-documents/picker';
import { launchImageLibrary, MediaType, PhotoQuality } from 'react-native-image-picker';
import supportService, { CreateTicketData } from '../services/supportService';
import { useAuth } from '../contexts/AuthContext';

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  order_status: string;
  created_at: string;
}

interface AttachmentFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

type RootStackParamList = {
  CreateTicket: {
    orderId?: number;
  };
};

type CreateTicketRouteProp = RouteProp<RootStackParamList, 'CreateTicket'>;

const CreateTicketScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreateTicketRouteProp>();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Safe currency formatting function
  const formatCurrency = (amount: any): string => {
    try {
      if (amount === null || amount === undefined || amount === '') {
        return '$0.00';
      }
      const numAmount = parseFloat(String(amount));
      if (isNaN(numAmount)) {
        return '$0.00';
      }
      return `$${numAmount.toFixed(2)}`;
    } catch (error) {
      return '$0.00';
    }
  };

  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'complaint' | 'inquiry' | 'order_issue'>('inquiry');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // Validation state
  const [subjectError, setSubjectError] = useState('');
  const [messageError, setMessageError] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories] = useState([
    { value: 'complaint', label: 'Complaint', icon: 'alert-circle', color: '#ff4d4f' },
    { value: 'inquiry', label: 'Inquiry', icon: 'help-circle', color: '#1890ff' },
    { value: 'order_issue', label: 'Order Issue', icon: 'shopping-cart', color: '#faad14' },
  ]);
  const [priorities] = useState([
    { value: 'low', label: 'Low', color: '#52c41a' },
    { value: 'medium', label: 'Medium', color: '#faad14' },
    { value: 'high', label: 'High', color: '#ff7875' },
    { value: 'urgent', label: 'Urgent', color: '#ff4d4f' },
  ]);
  const [showOrderPicker, setShowOrderPicker] = useState(false);

  useEffect(() => {
    fetchUserOrders();
    
    // If navigated from order details, pre-select the order
    if (route.params?.orderId) {
      // Set category to order_issue by default when coming from order
      setCategory('order_issue');
    }
  }, [route.params]);

  const fetchUserOrders = async () => {
    try {
      const userOrders = await supportService.getUserOrders();
      setOrders(userOrders);
      
      // Auto-select order if passed from navigation
      if (route.params?.orderId) {
        const preSelectedOrder = userOrders.find(order => order.id === route.params.orderId);
        if (preSelectedOrder) {
          setSelectedOrder(preSelectedOrder);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Validation helper functions
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const validateSubject = (text: string): { isValid: boolean; message: string } => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { isValid: false, message: 'Subject is required' };
    }
    if (trimmed.length < 5) {
      return { isValid: false, message: 'Subject must be at least 5 characters long' };
    }
    if (trimmed.length > 255) {
      return { isValid: false, message: 'Subject must be less than 255 characters' };
    }
    
    const wordCount = getWordCount(trimmed);
    if (wordCount < 2) {
      return { isValid: false, message: `Subject must contain at least 2 words (currently ${wordCount})` };
    }
    
    return { isValid: true, message: '' };
  };

  const validateMessage = (text: string): { isValid: boolean; message: string } => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { isValid: false, message: 'Message is required' };
    }
    if (trimmed.length < 10) {
      return { isValid: false, message: 'Message must be at least 10 characters long' };
    }
    if (trimmed.length > 5000) {
      return { isValid: false, message: 'Message must be less than 5000 characters' };
    }
    
    const wordCount = getWordCount(trimmed);
    if (wordCount < 4) {
      return { isValid: false, message: `Message must contain at least 4 words (currently ${wordCount})` };
    }
    
    return { isValid: true, message: '' };
  };

  // Input change handlers with validation
  const handleSubjectChange = (text: string) => {
    setSubject(text);
    const validation = validateSubject(text);
    setSubjectError(validation.isValid ? '' : validation.message);
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    const validation = validateMessage(text);
    setMessageError(validation.isValid ? '' : validation.message);
  };

  const handleSubmit = async () => {
    // Comprehensive validation
    const subjectValidation = validateSubject(subject);
    if (!subjectValidation.isValid) {
      Alert.alert('Subject Error', subjectValidation.message);
      return;
    }

    const messageValidation = validateMessage(message);
    if (!messageValidation.isValid) {
      Alert.alert('Message Error', messageValidation.message);
      return;
    }

    if (category === 'order_issue' && !selectedOrder) {
      Alert.alert(
        'Order Required', 
        'Please select an order for order issue requests. This helps our support team assist you better.'
      );
      return;
    }

    // Check attachment size limits
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = attachments.filter(file => file.size && file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      Alert.alert(
        'File Size Error',
        `The following files are too large (max 5MB each): ${oversizedFiles.map(f => f.name).join(', ')}`
      );
      return;
    }

    setLoading(true);

    try {
      const ticketData: CreateTicketData = {
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        order_id: selectedOrder?.id,
      };

      console.log('🎫 Creating ticket with data:', ticketData);
      const ticket = await supportService.createTicket(ticketData, attachments);
      
      Alert.alert(
        'Success! 🎉',
        `Your ticket #${ticket.ticket_number} has been created successfully. Our support team will respond soon.`,
        [
          {
            text: 'View Tickets',
            onPress: () => {
              navigation.goBack();
              navigation.navigate('SupportTickets' as never);
            },
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to create ticket. Please try again.';
      let errorTitle = 'Error';

      if (error.message) {
        if (error.message.includes('Validation failed')) {
          errorTitle = 'Validation Error';
          errorMessage = 'Please check your input and try again. Make sure all fields meet the requirements.';
        } else if (error.message.includes('Network')) {
          errorTitle = 'Network Error';
          errorMessage = 'Please check your internet connection and try again.';
        } else if (error.message.includes('Access token required') || error.message.includes('Invalid token')) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (error.message.includes('Server error') || error.message.includes('500')) {
          errorTitle = 'Server Error';
          errorMessage = 'Our servers are experiencing issues. Please try again in a few minutes.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      Alert.alert(errorTitle, errorMessage, [
        {
          text: 'Try Again',
          onPress: () => {},
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    } finally {
      setLoading(false);
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

      // setAttachments(prev => [...prev, ...newFiles]);
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

        setAttachments(prev => [...prev, newFile]);
      }
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={[
        styles.orderItem,
        selectedOrder?.id === item.id && styles.selectedOrderItem,
      ]}
      onPress={() => {
        setSelectedOrder(item);
        setShowOrderPicker(false);
      }}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{item.order_number}</Text>
        <Text style={styles.orderAmount}>{formatCurrency(item.total_amount)}</Text>
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.orderStatus}>{item.order_status}</Text>
        <Text style={styles.orderDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderAttachment = ({ item, index }: { item: AttachmentFile; index: number }) => (
    <View style={styles.attachmentItem}>
      <Icon name="document" size={20} color="#666" />
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.size && (
          <Text style={styles.attachmentSize}>
            {supportService.formatFileSize(item.size)}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.removeAttachment}
        onPress={() => removeAttachment(index)}
      >
        <Icon name="close-circle" size={20} color="#ff4d4f" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Support Ticket</Text>
      </View>

      {/* Category Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category *</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryItem,
                category === cat.value && { ...styles.selectedCategoryItem, borderColor: cat.color },
              ]}
              onPress={() => setCategory(cat.value as any)}
            >
              <Icon
                name={cat.icon}
                size={24}
                color={category === cat.value ? cat.color : '#666'}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  category === cat.value && { color: cat.color },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Priority Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Priority</Text>
        <View style={styles.priorityContainer}>
          {priorities.map((pri) => (
            <TouchableOpacity
              key={pri.value}
              style={[
                styles.priorityItem,
                priority === pri.value && { backgroundColor: pri.color + '20', borderColor: pri.color },
              ]}
              onPress={() => setPriority(pri.value as any)}
            >
              <Text
                style={[
                  styles.priorityLabel,
                  priority === pri.value && { color: pri.color },
                ]}
              >
                {pri.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Order Selection (for order issues) */}
      {category === 'order_issue' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Related Order *</Text>
          <TouchableOpacity
            style={styles.orderSelector}
            onPress={() => setShowOrderPicker(true)}
          >
            {selectedOrder ? (
              <View style={styles.selectedOrderDisplay}>
                <Text style={styles.selectedOrderText}>
                  #{selectedOrder.order_number} - {formatCurrency(selectedOrder.total_amount)}
                </Text>
                <Text style={styles.selectedOrderSubtext}>
                  {selectedOrder.order_status} • {new Date(selectedOrder.created_at).toLocaleDateString()}
                </Text>
              </View>
            ) : (
              <Text style={styles.orderSelectorPlaceholder}>Select an order</Text>
            )}
            <Icon name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Subject Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subject *</Text>
        <TextInput
          style={[styles.textInput, subjectError ? styles.textInputError : null]}
          value={subject}
          onChangeText={handleSubjectChange}
          placeholder="Brief description of your issue (minimum 2 words)"
          placeholderTextColor="#999"
          maxLength={255}
        />
        <View style={styles.inputFooter}>
          <Text style={styles.characterCount}>
            {subject.length}/255 characters • {getWordCount(subject)}/2 words
          </Text>
        </View>
        {subjectError ? (
          <Text style={styles.errorText}>{subjectError}</Text>
        ) : null}
      </View>

      {/* Message Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Message *</Text>
        <TextInput
          style={[styles.textInput, styles.messageInput, messageError ? styles.textInputError : null]}
          value={message}
          onChangeText={handleMessageChange}
          placeholder="Please provide detailed information about your issue (minimum 4 words)..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={5000}
        />
        <View style={styles.inputFooter}>
          <Text style={styles.characterCount}>
            {message.length}/5000 characters • {getWordCount(message)}/4 words
          </Text>
        </View>
        {messageError ? (
          <Text style={styles.errorText}>{messageError}</Text>
        ) : null}
      </View>

      {/* Attachments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attachments</Text>
        <View style={styles.attachmentButtons}>
          <TouchableOpacity style={styles.attachmentButton} onPress={pickDocument}>
            <Icon name="document" size={20} color="#1890ff" />
            <Text style={styles.attachmentButtonText}>Add Document</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachmentButton} onPress={pickImage}>
            <Icon name="camera" size={20} color="#1890ff" />
            <Text style={styles.attachmentButtonText}>Add Photo</Text>
          </TouchableOpacity>
        </View>

        {attachments.length > 0 && (
          <FlatList
            data={attachments}
            renderItem={renderAttachment}
            keyExtractor={(item, index) => index.toString()}
            style={styles.attachmentsList}
          />
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton, 
          (loading || subjectError || messageError) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={loading || !!subjectError || !!messageError}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Icon name="send" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Create Ticket</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Order Picker Modal */}
      <Modal
        visible={showOrderPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOrderPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Order</Text>
              <TouchableOpacity onPress={() => setShowOrderPicker(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={orders}
              renderItem={renderOrderItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.ordersList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedCategoryItem: {
    backgroundColor: '#f6ffed',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  priorityItem: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 6,
    alignItems: 'center',
  },
  priorityLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectedOrderDisplay: {
    flex: 1,
  },
  selectedOrderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedOrderSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  orderSelectorPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  attachmentButtons: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1890ff',
  },
  attachmentButtonText: {
    fontSize: 14,
    color: '#1890ff',
    marginLeft: 6,
  },
  attachmentsList: {
    maxHeight: 200,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginBottom: 8,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 8,
  },
  attachmentName: {
    fontSize: 14,
    color: '#333',
  },
  attachmentSize: {
    fontSize: 12,
    color: '#666',
  },
  removeAttachment: {
    padding: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1890ff',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  ordersList: {
    padding: 16,
  },
  orderItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selectedOrderItem: {
    borderColor: '#1890ff',
    backgroundColor: '#f0f9ff',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1890ff',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderStatus: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  textInputError: {
    borderColor: '#ff4d4f',
    borderWidth: 2,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ff4d4f',
    marginTop: 4,
    marginBottom: 8,
  },
});

export default CreateTicketScreen;
