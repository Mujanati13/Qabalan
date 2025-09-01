import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';

interface AddressBookScreenProps {
  navigation: any;
}

const AddressBookScreen: React.FC<AddressBookScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <Icon name="location-outline" size={64} color="#ccc" />
        <Text style={styles.emptyStateTitle}>{t('profile.addressBook')}</Text>
        <Text style={styles.emptyStateDescription}>
          Manage your delivery addresses
        </Text>
        
  <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddressForm')}>
          <Icon name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
  fontSize: 14,
    color: '#666',
    textAlign: 'center',
  marginBottom: 24,
  lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  backgroundColor: '#007AFF',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
  fontSize: 15,
  fontWeight: '600',
  marginLeft: 8,
  },
});

export default AddressBookScreen;
