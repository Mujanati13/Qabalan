import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://qablanapi.albech.me/api'; // Update this to your backend URL
// const API_BASE_URL = 'http://172.27.160.1:3015/api'; 

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_type: string;
  avatar?: string;
  birth_date?: string;
  is_verified: boolean;
  is_active: boolean;
  email_verified_at?: string;
  phone_verified_at?: string;
  notification_promo: boolean;
  notification_orders: boolean;
  loyalty_points?: number;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

interface UserLoyaltyPoints {
  id: number;
  user_id: number;
  total_points: number;
  available_points: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  updated_at: string;
}

interface PointTransaction {
  id: number;
  user_id: number;
  order_id?: number;
  points: number;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus';
  description_ar?: string;
  description_en?: string;
  expires_at?: string;
  created_at: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  message_ar: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    value: any;
  }>;
}

interface Category {
  id: number;
  parent_id?: number;
  title_ar: string;
  title_en: string;
  description_ar?: string;
  description_en?: string;
  slug: string;
  image?: string;
  banner_image?: string;
  banner_mobile?: string;
  sort_order: number;
  is_active: boolean;
  products_count: number;
  parent_title_ar?: string;
  parent_title_en?: string;
}

interface Product {
  id: number;
  title_ar: string;
  title_en: string;
  description_ar?: string;
  description_en?: string;
  base_price: string | number;
  sale_price?: string | number | null;
  final_price: string | number;
  loyalty_points: number;
  main_image?: string;
  is_active: boolean;
  is_featured: boolean;
  stock_status: 'in_stock' | 'out_of_stock' | 'limited';
  sku: string;
  category_title_ar?: string;
  category_title_en?: string;
  is_favorited: boolean;
}

interface CartItem {
  product_id: number;
  variant_id?: number;
  quantity: number;
  special_instructions?: string;
  product?: Product;
}

interface OrderCalculation {
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  points_earned: number;
  promo_details?: PromoCode;
  // Client-augmented: amount of delivery fee waived due to free-shipping promos
  waived_delivery_fee?: number;
}

interface Address {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  city_id: number;
  city_title_ar: string;
  city_title_en: string;
  area_id: number;
  area_title_ar: string;
  area_title_en: string;
  delivery_fee: string; // API returns as string
  street_id?: number;
  street_title_ar?: string;
  street_title_en?: string;
  building_no: string;
  floor_no?: string;
  apartment_no?: string;
  details?: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateOrderData {
  order_type: 'delivery' | 'pickup';
  payment_method: string;
  delivery_address_id?: number;
  branch_id?: number;
  is_guest?: boolean;
  guest_delivery_address?: string | {
    address?: string;
    latitude?: number;
    longitude?: number;
    branch_id?: number;
    area_id?: number;
  };
  items: {
    product_id: number;
    variant_id?: number;
    quantity: number;
    special_instructions?: string;
  }[];
  promo_code?: string;
  points_to_use?: number;
  special_instructions?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

interface City {
  id: number;
  title_ar: string;
  title_en: string;
  is_active: boolean;
}

interface Area {
  id: number;
  city_id: number;
  title_ar: string;
  title_en: string;
  delivery_fee: string; // API returns as string like "0.00"
  is_active: boolean;
}

interface Street {
  id: number;
  area_id: number;
  title_ar: string;
  title_en: string;
  is_active: boolean;
}

interface PromoCode {
  id: number;
  code: string;
  title_ar: string;
  title_en: string;
  description_ar?: string;
  description_en?: string;
  discount_type: 'percentage' | 'fixed' | 'fixed_amount' | 'free_shipping' | 'bxgy';
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  user_usage_limit?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

interface Order {
  id: number;
  order_number: string;
  user_id: number;
  branch_id?: number;
  delivery_address_id?: number;
  order_type: 'delivery' | 'pickup';
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  subtotal: number;
  delivery_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  promo_code_id?: number;
  promo_code?: string;
  promo_title_ar?: string;
  promo_title_en?: string;
  created_at: string;
  estimated_delivery_time?: string;
  delivered_at?: string;
  cancelled_at?: string;
  special_instructions?: string;
  // Extended fields for detailed order view
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  branch_title_ar?: string;
  branch_title_en?: string;
  items_count?: number;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  variant_id?: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
  product_title_ar?: string;
  product_title_en?: string;
  product_image?: string;
  product_sku?: string;
  variant_title_ar?: string;
  variant_title_en?: string;
}

interface OrderStatusHistory {
  id: number;
  order_id: number;
  status: string;
  note?: string;
  changed_by?: number;
  created_at: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ProductsApiResponse {
  success: boolean;
  message?: string;
  message_ar?: string;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// PRODUCT REVIEW TYPES
// =============================================================================

interface ProductReview {
  id: number;
  product_id: number;
  user_id: number;
  order_id?: number;
  order_item_id?: number;
  rating: number; // 1-5
  title?: string;
  review_text?: string;
  pros?: string;
  cons?: string;
  is_verified_purchase: boolean;
  is_featured: boolean;
  is_approved: boolean;
  helpful_count: number;
  not_helpful_count: number;
  admin_response?: string;
  admin_response_at?: string;
  admin_response_by?: number;
  created_at: string;
  updated_at: string;
  // Extended fields
  user_first_name?: string;
  user_last_name?: string;
  user_avatar?: string;
  user_has_voted?: 'helpful' | 'not_helpful' | null;
  images?: ReviewImage[];
}

interface ReviewImage {
  id: number;
  review_id: number;
  image_url: string;
  alt_text?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface ProductRatingSummary {
  product_id: number;
  total_reviews: number;
  average_rating: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
  verified_purchase_count: number;
  featured_review_count: number;
  last_review_at?: string;
  updated_at: string;
}

interface ReviewableOrderItem {
  order_item_id: number;
  order_id: number;
  order_number: string;
  product_id: number;
  product_title_ar: string;
  product_title_en: string;
  product_image?: string;
  delivered_at: string;
  has_review: boolean;
  review_id?: number;
}

// =============================================================================
// API SERVICE
// =============================================================================

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadTokens();
  }

  private async loadTokens() {
    try {
      this.accessToken = await AsyncStorage.getItem('accessToken');
      this.refreshToken = await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  private async saveTokens(tokens: Tokens) {
    try {
      await AsyncStorage.setItem('accessToken', tokens.accessToken);
      await AsyncStorage.setItem('refreshToken', tokens.refreshToken);
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  private async clearTokens() {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    // Debug logging for address-related requests
    const isAddressRequest = endpoint.includes('/addresses');
    if (isAddressRequest) {
      console.log('\n🔄 === API SERVICE DEBUG ===');
      console.log('📡 Making request to:', url);
      console.log('🔧 Method:', options.method || 'GET');
      console.log('📋 Headers:', headers);
      if (options.body) {
        console.log('📦 Request body:', options.body);
        try {
          const parsedBody = JSON.parse(options.body as string);
          console.log('📦 Parsed body:', parsedBody);
        } catch (e) {
          console.log('⚠️ Could not parse body as JSON');
        }
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (isAddressRequest) {
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
      }

      const data: ApiResponse<T> = await response.json();

      if (isAddressRequest) {
        console.log('📄 Response data:', data);
      }

      // Handle token refresh
      if (response.status === 401 && this.refreshToken) {
        if (isAddressRequest) {
          console.log('🔄 401 received, attempting token refresh...');
        }
        
        const refreshSuccess = await this.refreshAccessToken();
        if (refreshSuccess) {
          if (isAddressRequest) {
            console.log('✅ Token refresh successful, retrying request...');
          }
          
          // Retry the original request with new token
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          
          const retryData = await retryResponse.json();
          
          if (isAddressRequest) {
            console.log('📥 Retry response status:', retryResponse.status);
            console.log('📄 Retry response data:', retryData);
          }
          
          return retryData;
        } else if (isAddressRequest) {
          console.log('❌ Token refresh failed');
        }
      }

      return data;
    } catch (error) {
      if (isAddressRequest) {
        console.error('💥 API request failed:', error);
        console.error('🔍 Error details:', {
          message: (error as any)?.message,
          name: (error as any)?.name,
          stack: (error as any)?.stack?.slice(0, 300)
        });
      } else {
        console.error('API request failed:', error);
      }
      throw new Error('Network request failed');
    }
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: Tokens }>> {
    const response = await this.makeRequest<{ user: User; tokens: Tokens }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      await this.saveTokens(response.data.tokens);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async register(data: RegisterData): Promise<ApiResponse<{ user_id: number; email: string; verification_required: boolean }>> {
    return this.makeRequest<{ user_id: number; email: string; verification_required: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      const data: ApiResponse<{ tokens: Tokens }> = await response.json();

      if (data.success && data.data) {
        await this.saveTokens(data.data.tokens);
        return true;
      }

      // Refresh failed, clear tokens
      await this.clearTokens();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearTokens();
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await this.makeRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      await this.clearTokens();
    }
  }

  // =============================================================================
  // AUTHENTICATION HELPER METHODS
  // =============================================================================

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) {
      await this.loadTokens();
    }
    return this.accessToken;
  }

  async setTokens(tokens: Tokens): Promise<void> {
    await this.saveTokens(tokens);
  }

  getBaseURL(): string {
    return API_BASE_URL.replace('/api', '');
  }

  async getToken(): Promise<string | null> {
    return this.getAccessToken();
  }

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    
    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Check if it's a data URL (base64)
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    
    // For local files, construct the uploads URL
    const cleanUrl = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    
    // If it doesn't already include uploads path, add it
    if (!cleanUrl.startsWith('uploads/')) {
      return `${API_BASE_URL}/uploads/products/${cleanUrl}`;
    }
    
    // If it already includes uploads path, just add the base URL
    return `${API_BASE_URL.replace('/api', '')}/${cleanUrl}`;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async verifyEmail(userId: number, code: string): Promise<ApiResponse> {
    return this.makeRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, code }),
    });
  }

  async resendVerificationCode(email: string): Promise<ApiResponse> {
    return this.makeRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // =============================================================================
  // PROFILE MANAGEMENT METHODS
  // =============================================================================

  async getUserProfile(userId?: number): Promise<ApiResponse<User>> {
    const endpoint = userId ? `/users/${userId}` : `/users/${(await this.getCurrentUser())?.id}`;
    return this.makeRequest<User>(endpoint);
  }

  async updateUserProfile(data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    birth_date?: string;
    avatar?: string;
    notification_promo?: boolean;
    notification_orders?: boolean;
  }): Promise<ApiResponse<User>> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const response = await this.makeRequest<User>(`/users/${currentUser.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    // If there are validation errors, throw a descriptive error
    if (!response.success && response.errors && response.errors.length > 0) {
      const errorMessages = response.errors.map(err => err.message).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    // If there's a general error message, throw it
    if (!response.success) {
      throw new Error(response.message || 'Update failed');
    }

    // Update stored user data if successful
    if (response.success && response.data) {
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    }

    return response;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    return this.makeRequest(`/users/${currentUser.id}/change-password`, {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  async getUserLoyaltyPoints(): Promise<ApiResponse<UserLoyaltyPoints>> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    return this.makeRequest<UserLoyaltyPoints>(`/users/${currentUser.id}/loyalty-points`);
  }

  async getPointTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<ApiResponse<PaginatedResponse<PointTransaction>>> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.type) searchParams.append('type', params.type);

    const queryString = searchParams.toString();
    return this.makeRequest<PaginatedResponse<PointTransaction>>(
      `/users/${currentUser.id}/point-transactions${queryString ? `?${queryString}` : ''}`
    );
  }

  // =============================================================================
  // PRODUCT AND CATEGORY METHODS
  // =============================================================================

  async getCategories(params?: {
    parent_id?: number | 'null';
    include_inactive?: boolean;
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<Category[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.parent_id !== undefined) {
      searchParams.append('parent_id', params.parent_id.toString());
    }
    if (params?.include_inactive) {
      searchParams.append('include_inactive', 'true');
    }
    if (params?.search) {
      searchParams.append('search', params.search);
    }
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/categories?${queryString}` : '/categories';

    return this.makeRequest<Category[]>(endpoint);
  }

  async getCategoryTree(): Promise<ApiResponse<Category[]>> {
    return this.makeRequest<Category[]>('/categories/tree');
  }

  async getProducts(params?: {
    page?: number;
    limit?: number;
    category_id?: number;
    search?: string;
    sort?: 'created_at' | 'title_ar' | 'title_en' | 'base_price' | 'final_price' | 'sort_order';
    order?: 'asc' | 'desc';
    is_featured?: boolean;
    min_price?: number;
    max_price?: number;
    stock_status?: 'in_stock' | 'out_of_stock' | 'limited';
  }): Promise<ProductsApiResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.category_id) searchParams.append('category_id', params.category_id.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.sort) searchParams.append('sort', params.sort);
    if (params?.order) searchParams.append('order', params.order);
    if (params?.is_featured !== undefined) searchParams.append('is_featured', params.is_featured.toString());
    if (params?.min_price) searchParams.append('min_price', params.min_price.toString());
    if (params?.max_price) searchParams.append('max_price', params.max_price.toString());
    if (params?.stock_status) searchParams.append('stock_status', params.stock_status);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';

    // The products API returns data directly, not wrapped in ApiResponse
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, { headers });
      const data: ProductsApiResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Products API request failed:', error);
      throw new Error('Network request failed');
    }
  }

  async getFeaturedProducts(limit: number = 6): Promise<ProductsApiResponse> {
    return this.getProducts({ is_featured: true, limit, sort: 'created_at', order: 'desc' });
  }

  async getProductById(productId: number): Promise<ApiResponse<Product>> {
    const response = await this.makeRequest<{product: Product}>(`/products/${productId}`);
    
    // The API returns the product nested under data.product, so we need to extract it
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.product
      } as ApiResponse<Product>;
    }
    
    return response as any;
  }

  async getTopCategories(limit: number = 8): Promise<ApiResponse<Category[]>> {
    return this.getCategories({ parent_id: 'null', limit });
  }

  async getBannerCategories(): Promise<ApiResponse<Category[]>> {
    // Get categories that have banner images
    const response = await this.getCategories({ parent_id: 'null' });
    if (response.success && response.data && Array.isArray(response.data)) {
      const bannersOnly = response.data.filter(cat => cat.banner_image || cat.banner_mobile);
      return {
        ...response,
        data: bannersOnly.slice(0, 5) // Limit to 5 banners
      };
    }
    return {
      success: false,
      message: response.message || 'Failed to load banner categories',
      message_ar: response.message_ar || 'فشل في تحميل فئات البانر',
      data: []
    };
  }

  // =============================================================================
  // ORDER METHODS
  // =============================================================================

  async calculateOrderTotals(data: {
    items: { product_id: number; variant_id?: number; quantity: number }[];
    delivery_address_id?: number;
    guest_delivery_address?: string | {
      address?: string;
      latitude?: number;
      longitude?: number;
      branch_id?: number;
      area_id?: number;
    };
  branch_id?: number;
    order_type: 'delivery' | 'pickup';
    promo_code?: string;
    points_to_use?: number;
    is_guest?: boolean;
  }): Promise<ApiResponse<OrderCalculation>> {
    return this.makeRequest<OrderCalculation>('/orders/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createOrder(orderData: CreateOrderData): Promise<ApiResponse<{
    order: Order;
    order_items: OrderItem[];
  }>> {
    return this.makeRequest<{
      order: Order;
      order_items: OrderItem[];
    }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getUserOrders(userId: number, params?: {
    page?: number;
    limit?: number;
    status?: string;
    order_type?: string;
  }): Promise<ApiResponse<PaginatedResponse<Order>>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.order_type) searchParams.append('order_type', params.order_type);

    const queryString = searchParams.toString();
    return this.makeRequest<PaginatedResponse<Order>>(
      `/users/${userId}/orders${queryString ? `?${queryString}` : ''}`
    );
  }

  async getOrderDetails(orderId: number): Promise<ApiResponse<{
    order: Order;
    order_items: OrderItem[];
    status_history: OrderStatusHistory[];
  }>> {
    return this.makeRequest<{
      order: Order;
      order_items: OrderItem[];
      status_history: OrderStatusHistory[];
    }>(`/orders/${orderId}`);
  }

  async confirmOrderReceipt(orderId: number): Promise<ApiResponse<Order>> {
    return this.makeRequest<Order>(`/orders/${orderId}/confirm-receipt`, {
      method: 'POST',
    });
  }

  async reorderPreviousOrder(orderId: number): Promise<ApiResponse<{
    order: Order;
    order_items: OrderItem[];
  }>> {
    return this.makeRequest<{
      order: Order;
      order_items: OrderItem[];
    }>(`/orders/${orderId}/reorder`, {
      method: 'POST',
    });
  }

  // =============================================================================
  // ADDRESS METHODS
  // =============================================================================

  async getUserAddresses(): Promise<ApiResponse<Address[]>> {
    return this.makeRequest<Address[]>('/addresses');
  }

  async getAddress(addressId: number): Promise<ApiResponse<Address>> {
    return this.makeRequest<Address>(`/addresses/${addressId}`);
  }

  async createAddress(addressData: {
    name: string;
    phone: string;
    city_id?: number;
    area_id?: number;
    street_id?: number;
    building_no: string; // Changed from building_number to match backend
    floor_no?: string; // Changed from floor_number to match backend
    apartment_no?: string; // Changed from apartment_number to match backend
    details?: string; // Changed from landmark to match backend
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
  }): Promise<ApiResponse<Address>> {
    return this.makeRequest<Address>('/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
  }

  async updateAddress(addressId: number, addressData: {
    name?: string;
    phone?: string;
    city_id?: number;
    area_id?: number;
    street_id?: number;
    building_no?: string; // Changed from building_number to match backend
    floor_no?: string; // Changed from floor_number to match backend
    apartment_no?: string; // Changed from apartment_number to match backend
    details?: string; // Changed from landmark to match backend
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
  }): Promise<ApiResponse<Address>> {
    return this.makeRequest<Address>(`/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(addressData),
    });
  }

  async deleteAddress(addressId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>(`/addresses/${addressId}`, {
      method: 'DELETE',
    });
  }

  async setDefaultAddress(addressId: number): Promise<ApiResponse<Address>> {
    return this.makeRequest<Address>(`/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_default: true }),
    });
  }

  // =============================================================================
  // LOCATION METHODS
  // =============================================================================

  async getCities(): Promise<ApiResponse<City[]>> {
    return this.makeRequest<City[]>('/addresses/locations/cities');
  }

  async getAreas(cityId: number): Promise<ApiResponse<Area[]>> {
    return this.makeRequest<Area[]>(`/addresses/locations/areas/${cityId}`);
  }

  async getStreets(areaId: number): Promise<ApiResponse<Street[]>> {
    return this.makeRequest<Street[]>(`/addresses/locations/streets/${areaId}`);
  }

  // =============================================================================
  // PROMO CODE METHODS
  // =============================================================================

  async validatePromoCode(code: string, subtotal: number, isGuest: boolean = false): Promise<ApiResponse<{
    promo: PromoCode;
    discount_amount: number;
    final_amount: number;
  }>> {
    const endpoint = isGuest ? '/promos/validate-guest' : '/promos/validate';
    const resp = await this.makeRequest<{
      // Some backends return `promo`, others `promo_code`
      promo?: PromoCode;
      promo_code?: PromoCode;
      discount_amount?: number;
      discount?: number;
      // Some backends return `final_amount`, others `final_total`
      final_amount?: number;
      final_total?: number;
      total?: number;
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ code, order_total: subtotal }),
    });

    // Normalize response shape for callers
    try {
      if (resp && resp.data) {
        const d: any = resp.data;
        const promo: any = d.promo ?? d.promo_code ?? null;

        // Coerce numeric promo fields when they come back as strings
        if (promo) {
          const numOr = (v: any) => (typeof v === 'string' ? parseFloat(v) : v);
          if (promo.discount_value !== undefined) promo.discount_value = numOr(promo.discount_value) ?? 0;
          if (promo.min_order_amount !== undefined) promo.min_order_amount = numOr(promo.min_order_amount);
          if (promo.max_discount_amount !== undefined) promo.max_discount_amount = numOr(promo.max_discount_amount);
        }

        const normalized = {
          promo,
          discount_amount: (d.discount_amount ?? d.discount ?? 0) as number,
          final_amount: (d.final_amount ?? d.final_total ?? d.total ?? 0) as number,
        } as { promo: PromoCode; discount_amount: number; final_amount: number };

        return { ...resp, data: normalized } as ApiResponse<{
          promo: PromoCode;
          discount_amount: number;
          final_amount: number;
        }>;
      }
    } catch (e) {
      // Fall through to return raw response on any normalization error
    }

    return resp as unknown as ApiResponse<{
      promo: PromoCode;
      discount_amount: number;
      final_amount: number;
    }>;
  }

  // =============================================================================
  // PRODUCT REVIEW METHODS
  // =============================================================================

  async getProductReviews(productId: number, params?: {
    page?: number;
    limit?: number;
    rating?: number;
    verified_only?: boolean;
    sort?: 'created_at' | 'rating' | 'helpful_count';
    order?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginatedResponse<ProductReview>>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.rating) searchParams.append('rating', params.rating.toString());
    if (params?.verified_only) searchParams.append('verified_only', 'true');
    if (params?.sort) searchParams.append('sort', params.sort);
    if (params?.order) searchParams.append('order', params.order);

    const queryString = searchParams.toString();
    return this.makeRequest<PaginatedResponse<ProductReview>>(
      `/reviews/product/${productId}${queryString ? `?${queryString}` : ''}`
    );
  }

  async getProductRatingSummary(productId: number): Promise<ApiResponse<ProductRatingSummary>> {
    return this.makeRequest<ProductRatingSummary>(`/reviews/product/${productId}/summary`);
  }

  async createProductReview(data: {
    product_id: number;
    order_item_id?: number;
    rating: number;
    title?: string;
    review_text?: string;
    pros?: string;
    cons?: string;
  }, images?: File[]): Promise<ApiResponse<ProductReview>> {
    // If no images, use regular JSON request
    if (!images || images.length === 0) {
      return this.makeRequest<ProductReview>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }

    // If images provided, use FormData
    const formData = new FormData();
    
    // Add review data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Add images
    images.forEach(image => {
      formData.append('images', image);
    });

    // Make request without setting Content-Type (let browser set it for FormData)
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return await response.json();
  }

  async updateProductReview(reviewId: number, data: {
    rating?: number;
    title?: string;
    review_text?: string;
    pros?: string;
    cons?: string;
  }, imagesToAdd?: File[], imageIdsToRemove?: number[]): Promise<ApiResponse<ProductReview>> {
    // If no images to add/remove, use regular JSON request
    if ((!imagesToAdd || imagesToAdd.length === 0) && (!imageIdsToRemove || imageIdsToRemove.length === 0)) {
      return this.makeRequest<ProductReview>(`/reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }

    // If images provided, use FormData
    const formData = new FormData();
    
    // Add review data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Add new images
    if (imagesToAdd && imagesToAdd.length > 0) {
      imagesToAdd.forEach(image => {
        formData.append('images', image);
      });
    }

    // Add image IDs to remove
    if (imageIdsToRemove && imageIdsToRemove.length > 0) {
      imageIdsToRemove.forEach(imageId => {
        formData.append('remove_image_ids[]', imageId.toString());
      });
    }

    // Make request without setting Content-Type (let browser set it for FormData)
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: 'PUT',
      headers,
      body: formData,
    });

    return await response.json();
  }

  async deleteProductReview(reviewId: number): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }

  async voteOnReview(reviewId: number, voteType: 'helpful' | 'not_helpful'): Promise<ApiResponse<{
    helpful_count: number;
    not_helpful_count: number;
    user_vote: 'helpful' | 'not_helpful' | null;
  }>> {
    return this.makeRequest(`/reviews/${reviewId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote_type: voteType }),
    });
  }

  async removeReviewVote(reviewId: number): Promise<ApiResponse<{
    helpful_count: number;
    not_helpful_count: number;
    user_vote: 'helpful' | 'not_helpful' | null;
  }>> {
    return this.makeRequest(`/reviews/${reviewId}/vote`, {
      method: 'DELETE',
    });
  }

  async getUserReviews(params?: {
    page?: number;
    limit?: number;
    product_id?: number;
  }): Promise<ApiResponse<PaginatedResponse<ProductReview>>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.product_id) searchParams.append('product_id', params.product_id.toString());

    const queryString = searchParams.toString();
    return this.makeRequest<PaginatedResponse<ProductReview>>(
      `/reviews/user${queryString ? `?${queryString}` : ''}`
    );
  }

  async getReviewableOrders(params?: {
    page?: number;
    limit?: number;
    product_id?: number;
  }): Promise<ApiResponse<PaginatedResponse<ReviewableOrderItem>>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.product_id) searchParams.append('product_id', params.product_id.toString());

    const queryString = searchParams.toString();
    return this.makeRequest<PaginatedResponse<ReviewableOrderItem>>(
      `/reviews/reviewable-orders${queryString ? `?${queryString}` : ''}`
    );
  }

  async getReview(reviewId: number): Promise<ApiResponse<ProductReview>> {
    return this.makeRequest<ProductReview>(`/reviews/${reviewId}`);
  }

  // =============================================================================
  // NOTIFICATION METHODS
  // =============================================================================

  async registerFCMToken(token: string, platform: string): Promise<ApiResponse<{ success: boolean }>> {
    console.log('[API][DEBUG] 🚀 registerFCMToken called');
    console.log('[API][DEBUG] 📱 Platform:', platform);
    console.log('[API][DEBUG] 🎫 Token:', `${token.substring(0, 20)}...`);
    
    const body = { 
      token: token,
      device_type: platform === 'ios' ? 'ios' : 'android'
    };
    console.log('[API][DEBUG] 📦 Request body:', { ...body, token: `${token.substring(0, 20)}...` });
    
    const result = await this.makeRequest<{ success: boolean }>('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    console.log('[API][DEBUG] 📡 API Response:', result);
    return result;
  }

  async clearFCMToken(token: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>('/notifications/unregister-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  }

  async removeFCMToken(): Promise<ApiResponse<{ success: boolean }>> {
    // This method removes the current user's token but we need the token
    // The calling code should use clearFCMToken with the actual token
    throw new Error('Use clearFCMToken(token) instead - token parameter is required');
  }

  async updateNotificationPreferences(preferences: {
    promo_notifications?: boolean;
    order_notifications?: boolean;
    push_enabled?: boolean;
  }): Promise<ApiResponse<{ success: boolean }>> {
    // TODO: Implement when backend preferences endpoint is available
    throw new Error('Notification preferences endpoint not yet implemented');
  }

  // =============================================================================
  // BRANCH METHODS
  // =============================================================================

  async getBranches(): Promise<ApiResponse<{
    id: number;
    title_ar: string;
    title_en: string;
    description_ar?: string;
    description_en?: string;
    address_ar?: string;
    address_en?: string;
    phone?: string;
    email?: string;
    latitude?: number;
    longitude?: number;
    working_hours?: string;
    is_active: boolean;
  }[]>> {
    return this.makeRequest('/branches');
  }

  // =============================================================================
  // NOTIFICATION METHODS
  // =============================================================================

  async getNotifications(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const { page = 1, limit = 20 } = params || {};
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.makeRequest<any[]>(`/notifications?${query}`);
  }

  async getUnreadNotificationCount(): Promise<ApiResponse<{ count: number; }>> {
    return this.makeRequest<{ count: number; }>('/notifications/unread-count');
  }

  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<{ success: boolean; }>> {
    return this.makeRequest<{ success: boolean; }>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<{ success: boolean; }>> {
    return this.makeRequest<{ success: boolean; }>('/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  async sendSelfTestNotification(): Promise<ApiResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>('/notifications/self-test', {
      method: 'POST',
    });
  }
}

export default new ApiService();
export type { 
  User, 
  UserLoyaltyPoints,
  PointTransaction,
  LoginCredentials, 
  RegisterData, 
  ApiResponse, 
  Category, 
  Product, 
  PaginatedResponse, 
  Address, 
  CreateOrderData,
  City,
  Area,
  Street,
  CartItem, 
  OrderCalculation, 
  PromoCode, 
  Order, 
  OrderItem, 
  OrderStatusHistory,
  ProductReview,
  ReviewImage,
  ProductRatingSummary,
  ReviewableOrderItem
};
