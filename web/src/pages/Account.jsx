import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, addressesAPI, ordersAPI, paymentsAPI } from '../services/api';
import './Account.css';

const Account = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'profile');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }
    loadUserData();
  }, [user, authLoading, navigate]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const userResponse = await authAPI.getCurrentUser();
      console.log('👤 User response:', userResponse);
      const userData = userResponse.data.data?.user || userResponse.data.user;
      setProfileData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || ''
      });

      // Load addresses
      const addressResponse = await addressesAPI.getAll();
      console.log('📍 Address response:', addressResponse);
      console.log('📍 Address response.data:', addressResponse.data);
      console.log('📍 Address response.data.data:', addressResponse.data.data);
      
      // Backend returns: { success: true, data: [...addresses...], pagination: {...} }
      const fetchedAddresses = addressResponse.data.data || addressResponse.data.addresses || [];
      console.log('📍 Fetched addresses:', fetchedAddresses);
      setAddresses(fetchedAddresses);

      // Load orders
      try {
        const ordersResponse = await ordersAPI.getMyOrders();
        console.log('📦 Orders response:', ordersResponse);
        // Backend returns: { success: true, data: [...orders...], pagination: {...} }
        const fetchedOrders = ordersResponse.data.data || ordersResponse.data.orders || [];
        console.log('📦 Fetched orders:', fetchedOrders);
        setOrders(fetchedOrders);
      } catch (orderError) {
        console.error('Error loading orders:', orderError);
        // Don't fail entire page if orders can't load
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      console.error('Error response:', error.response);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRetryPayment = async (orderId) => {
    try {
      setLoading(true);
      console.log('🔄 Retrying payment for order:', orderId);
      
      // Create a new payment session
      const response = await paymentsAPI.createSession(orderId);
      console.log('💳 Full payment session response:', response);
      console.log('💳 Response data:', response.data);
      console.log('💳 Response data success:', response.data.success);
      console.log('💳 Response data checkoutUrl:', response.data.checkoutUrl);
      console.log('💳 Response data redirectUrl:', response.data.redirectUrl);
      
      if (response.data && response.data.success) {
        // Backend returns checkoutUrl directly in response.data
        const checkoutUrl = response.data.checkoutUrl || response.data.redirectUrl;
        
        console.log('💳 Final checkoutUrl:', checkoutUrl);
        
        if (checkoutUrl) {
          console.log('✅ Redirecting to payment:', checkoutUrl);
          window.location.href = checkoutUrl;
        } else {
          console.error('❌ No checkout URL in response:', response.data);
          alert('Failed to initialize payment. No checkout URL received.');
        }
      } else {
        console.error('❌ Response not successful:', response.data);
        alert(response.data?.message || 'Failed to create payment session');
      }
    } catch (error) {
      console.error('❌ Error retrying payment:', error);
      console.error('❌ Error response:', error.response);
      alert('Failed to retry payment. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="account-page">
        <div className="container">
          <div className="loading-message">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="container">
        <div className="account-header">
          <h1>My Account</h1>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        <div className="account-content">
          <div className="account-sidebar">
            <button
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <i className="fa fa-user"></i> Profile
            </button>
            <button
              className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <i className="fa fa-shopping-bag"></i> My Orders
            </button>
            <button
              className={`tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
              onClick={() => setActiveTab('addresses')}
            >
              <i className="fa fa-map-marker"></i> Addresses
            </button>
          </div>

          <div className="account-main">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                {activeTab === 'profile' && (
                  <div className="profile-section">
                    <h2>Profile Information</h2>
                    <div className="profile-info">
                      <div className="info-row">
                        <label>First Name:</label>
                        <span>{profileData.first_name}</span>
                      </div>
                      <div className="info-row">
                        <label>Last Name:</label>
                        <span>{profileData.last_name}</span>
                      </div>
                      <div className="info-row">
                        <label>Email:</label>
                        <span>{profileData.email}</span>
                      </div>
                      <div className="info-row">
                        <label>Phone:</label>
                        <span>{profileData.phone || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="orders-section">
                    <h2>Order History</h2>
                    {orders.length === 0 ? (
                      <div className="empty-state">
                        <p>No orders yet</p>
                        <button onClick={() => navigate('/shop')} className="shop-btn">
                          Start Shopping
                        </button>
                      </div>
                    ) : (
                      <div className="orders-list">
                        {orders.map(order => (
                          <div key={order.id} className="order-card">
                            <div className="order-header">
                              <span className="order-number">Order #{order.order_number}</span>
                              <span className={`order-status status-${order.order_status || order.status}`}>
                                {(order.order_status || order.status || 'pending').toUpperCase()}
                              </span>
                            </div>
                            <div className="order-body">
                              <div className="order-info">
                                <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</p>
                                <p><strong>Type:</strong> {order.order_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</p>
                                <p><strong>Payment:</strong> {order.payment_method === 'cash' ? '💵 Cash' : '💳 Card'} 
                                  {order.payment_status && (
                                    <span className={`payment-status-badge ${order.payment_status}`}>
                                      {order.payment_status}
                                    </span>
                                  )}
                                </p>
                                <p><strong>Total:</strong> <span className="order-total">${parseFloat(order.total_amount || 0).toFixed(2)}</span></p>
                                {order.items_count && <p><strong>Items:</strong> {order.items_count}</p>}
                              </div>
                              <div className="order-actions">
                                <button 
                                  onClick={() => navigate(`/order-confirmation/${order.id}`)}
                                  className="view-order-btn"
                                >
                                  View Details
                                </button>
                                {order.payment_method === 'card' && 
                                 (order.payment_status === 'failed' || order.payment_status === 'pending') && (
                                  <button 
                                    onClick={() => handleRetryPayment(order.id)}
                                    className="retry-payment-btn"
                                  >
                                    🔄 Retry Payment
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'addresses' && (
                  <div className="addresses-section">
                    <h2>Saved Addresses</h2>
                    {addresses.length === 0 ? (
                      <div className="empty-state">
                        <p>No saved addresses</p>
                        <button onClick={() => navigate('/checkout')} className="add-address-btn">
                          Add Address
                        </button>
                      </div>
                    ) : (
                      <div className="addresses-list">
                        {addresses.map(address => (
                          <div key={address.id} className="address-card">
                            <div className="address-header">
                              <h4>{address.name || 'Address'}</h4>
                              {address.is_default && (
                                <span className="default-badge">Default</span>
                              )}
                            </div>
                            <div className="address-body">
                              {address.phone && (
                                <p><i className="fa fa-phone"></i> {address.phone}</p>
                              )}
                              {address.building_no && (
                                <p><i className="fa fa-building"></i> Building: {address.building_no}</p>
                              )}
                              {address.floor_no && (
                                <p>Floor: {address.floor_no}</p>
                              )}
                              {address.apartment_no && (
                                <p>Apartment: {address.apartment_no}</p>
                              )}
                              {address.area_title_en && (
                                <p><i className="fa fa-map-marker"></i> {address.area_title_en}, {address.city_title_en}</p>
                              )}
                              {address.details && (
                                <p className="address-details">{address.details}</p>
                              )}
                              {address.latitude && address.longitude && (
                                <p className="coordinates">
                                  <i className="fa fa-location-arrow"></i> {parseFloat(address.latitude).toFixed(6)}, {parseFloat(address.longitude).toFixed(6)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
