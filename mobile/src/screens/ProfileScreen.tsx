import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import apiService, { User, UserLoyaltyPoints } from '../services/apiService';
import Colors from '../theme/colors';
import { Typography, Spacing, BorderRadius, Shadow } from '../theme';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user: authUser, logout, isGuest } = useAuth();
  
  const [user, setUser] = useState<User | null>(authUser);
  const [loyaltyPoints, setLoyaltyPoints] = useState<UserLoyaltyPoints | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!authUser) return;
    
    setLoading(true);
    try {
      // Get updated user profile
      const userResponse = await apiService.getUserProfile();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
      }

      // Get loyalty points
      const pointsResponse = await apiService.getUserLoyaltyPoints();
      if (pointsResponse.success && pointsResponse.data) {
        setLoyaltyPoints(pointsResponse.data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logoutConfirm'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('auth.logout'), 
          style: 'destructive',
          onPress: () => logout()
        }
      ]
    );
  };

  const profileMenuItems = [
    {
      icon: 'person-outline',
      title: t('profile.editProfile'),
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: 'star-outline',
      title: t('profile.loyaltyPoints'),
      subtitle: loyaltyPoints ? `${loyaltyPoints.available_points} ${t('common.points')}` : '',
      onPress: () => navigation.navigate('LoyaltyPoints'),
    },
    {
      icon: 'location-outline',
      title: t('profile.addressBook'),
      onPress: () => navigation.navigate('AddressBook'),
    },
    {
      icon: 'lock-closed-outline',
      title: t('profile.changePassword'),
      onPress: () => navigation.navigate('ChangePassword'),
    },
    {
      icon: 'headset-outline',
      title: 'Support Tickets',
      onPress: () => navigation.navigate('SupportTickets'),
    },
    {
      icon: 'settings-outline',
      title: t('settings.title'),
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  // Add development menu items in development mode
  if (__DEV__) {
    profileMenuItems.push({
      icon: 'notifications-outline',
      title: 'Notification Test',
      onPress: () => navigation.navigate('NotificationTest'),
    });
  }

  if (isGuest || !user) {
    return (
      <View style={styles.guestContainer}>
        <Icon name="person-circle-outline" size={100} color="#ddd" />
        <Text style={styles.guestTitle}>{t('auth.loginRequired')}</Text>
        <Text style={styles.guestMessage}>
          {t('profile.loginForFeatures')}
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => logout()} // This will take them back to auth screen
        >
          <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
        </TouchableOpacity>
        
        {/* Basic settings that don't require auth */}
        <View style={styles.guestMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings-outline" size={20} color="#666" />
            <Text style={styles.menuItemText}>{t('settings.title')}</Text>
            <Icon name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={40} color="#666" />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user.first_name} {user.last_name}
          </Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.phone && (
            <Text style={styles.userPhone}>{user.phone}</Text>
          )}
        </View>
      </View>

      {/* Loyalty Points Summary */}
      {loyaltyPoints && (
        <TouchableOpacity 
          style={styles.pointsCard}
          onPress={() => navigation.navigate('LoyaltyPoints')}
        >
          <View style={styles.pointsHeader}>
            <Icon name="star" size={24} color="#FFD700" />
            <Text style={styles.pointsTitle}>{t('profile.loyaltyPoints')}</Text>
            <Icon 
              name={isRTL ? "chevron-back" : "chevron-forward"} 
              size={20} 
              color="#666" 
            />
          </View>
          <View style={styles.pointsStats}>
            <View style={styles.pointsStat}>
              <Text style={styles.pointsNumber}>{loyaltyPoints.available_points}</Text>
              <Text style={styles.pointsLabel}>{t('profile.availablePoints')}</Text>
            </View>
            <View style={styles.pointsStat}>
              <Text style={styles.pointsNumber}>{loyaltyPoints.lifetime_earned}</Text>
              <Text style={styles.pointsLabel}>{t('profile.lifetimeEarned')}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Profile Menu */}
      <View style={styles.menuContainer}>
        {profileMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index === profileMenuItems.length - 1 && styles.lastMenuItem
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <Icon name={item.icon} size={24} color={Colors.primary} />
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                {item.subtitle && (
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                )}
              </View>
            </View>
            <Icon 
              name={isRTL ? "chevron-back" : "chevron-forward"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="log-out-outline" size={24} color="#FF3B30" />
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#888',
  },
  pointsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pointsTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  pointsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pointsStat: {
    alignItems: 'center',
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  pointsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  guestContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  guestMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 30,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guestMenu: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default ProfileScreen;
