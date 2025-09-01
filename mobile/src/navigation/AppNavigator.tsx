import React from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CartScreen from '../screens/CartScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import SearchScreen from '../screens/SearchScreen';
import ProductsScreen from '../screens/ProductsScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import AddressFormScreen from '../screens/AddressFormScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import LoyaltyPointsScreen from '../screens/LoyaltyPointsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import AddressBookScreen from '../screens/AddressBookScreen';
import AuthNavigator from './AuthNavigator';
import NotificationTestScreen from '../screens/NotificationTestScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SupportTicketsScreen from '../screens/SupportTicketsScreen';
import CreateTicketScreen from '../screens/CreateTicketScreen';
import TicketDetailsScreen from '../screens/TicketDetailsScreen';
import AboutScreen from '../screens/AboutScreen';

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigator for each tab
const HomeStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={{ title: t('navigation.home') }}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen} 
        options={{ title: t('products.productDetails') }}
      />
      <Stack.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ title: t('common.search') }}
      />
      <Stack.Screen 
        name="Products" 
        component={ProductsScreen} 
        options={{ title: t('products.products') }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen} 
        options={{ title: t('orders.orderDetails') }}
      />
      <Stack.Screen 
        name="CreateTicket" 
        component={CreateTicketScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const CategoriesStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen 
        name="CategoriesMain" 
        component={CategoriesScreen} 
        options={{ title: t('navigation.categories') }}
      />
      <Stack.Screen 
        name="CategoryProducts" 
        component={ProductsScreen} 
        options={({ route }) => ({ 
          title: (route.params as any)?.categoryName || t('products.products') 
        })}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen} 
        options={{ title: t('products.productDetails') }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen} 
        options={{ title: t('orders.orderDetails') }}
      />
      <Stack.Screen 
        name="CreateTicket" 
        component={CreateTicketScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const CartStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen 
        name="CartMain" 
        component={CartScreen} 
        options={{ title: t('navigation.cart') }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen} 
        options={{ title: t('checkout.title') }}
      />
      <Stack.Screen 
        name="AddressForm" 
        component={AddressFormScreen} 
        options={{ headerShown: false }} // We handle the header in the component
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen} 
        options={{ title: t('orders.orderDetails') }}
      />
      <Stack.Screen 
        name="CreateTicket" 
        component={CreateTicketScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const OrdersStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen 
        name="OrdersMain" 
        component={OrdersScreen} 
        options={{ title: t('orders.title') }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen} 
        options={{ title: t('orders.orderDetails') }}
      />
      <Stack.Screen 
        name="CreateTicket" 
        component={CreateTicketScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SupportTickets" 
        component={SupportTicketsScreen} 
        options={{ title: 'Support Tickets' }}
      />
      <Stack.Screen 
        name="TicketDetails" 
        component={TicketDetailsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ title: t('profile.title') }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen} 
        options={{ title: t('profile.editProfile') }}
      />
      <Stack.Screen 
        name="LoyaltyPoints" 
        component={LoyaltyPointsScreen} 
        options={{ title: t('profile.loyaltyPoints') }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen} 
        options={{ title: t('profile.changePassword') }}
      />
      <Stack.Screen 
        name="AddressBook" 
        component={AddressBookScreen} 
        options={{ title: t('profile.addressBook') }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: t('settings.title') }}
      />
      <Stack.Screen 
        name="About" 
        component={AboutScreen} 
        options={{ title: 'About' }}
      />
      <Stack.Screen 
        name="NotificationTest" 
        component={NotificationTestScreen} 
        options={{ title: 'Notification Test' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen} 
        options={{ title: t('orders.orderDetails') }}
      />
      <Stack.Screen 
        name="SupportTickets" 
        component={SupportTicketsScreen} 
        options={{ title: 'Support Tickets' }}
      />
      <Stack.Screen 
        name="CreateTicket" 
        component={CreateTicketScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TicketDetails" 
        component={TicketDetailsScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Custom cart icon with badge component (moved outside to avoid hook violations)
const CartIcon = ({ color, size, itemCount }: { color: string; size: number; itemCount: number }) => (
  <View style={styles.cartIconContainer}>
    <Icon name="basket" color={color} size={size} />
    {itemCount > 0 && (
      <View style={styles.cartBadge}>
        <Text style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
      </View>
    )}
  </View>
);

// Main bottom tab navigator
interface AppNavigatorProps {
  navigationRef?: React.RefObject<NavigationContainerRef<any>>;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({ navigationRef }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { isAuthenticated, isLoading, isGuest } = useAuth();
  const { itemCount } = useCart();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {(isAuthenticated || isGuest) ? (
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
            tabBarStyle: {
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
            },
          }}
        >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarLabel: t('navigation.home'),
            tabBarIcon: ({ color, size }) => (
              <Icon name="home" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Cart"
          component={CartStack}
          options={{
            tabBarLabel: t('navigation.cart'),
            tabBarIcon: ({ color, size }) => <CartIcon color={color} size={size} itemCount={itemCount} />,
          }}
        />
        <Tab.Screen
          name="Orders"
          component={OrdersStack}
          options={{
            tabBarLabel: t('navigation.orders'),
            tabBarIcon: ({ color, size }) => (
              <Icon name="receipt" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStack}
          options={{
            tabBarLabel: t('navigation.profile'),
            tabBarIcon: ({ color, size }) => (
              <Icon name="person" color={color} size={size} />
            ),
          }}
        />
        </Tab.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AppNavigator;
