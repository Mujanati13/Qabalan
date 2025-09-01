import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, Select, Typography, Space, 
  Divider, Alert, Spin, Steps, Radio, Row, Col, message
} from 'antd';
import { 
  ShoppingCartOutlined, EnvironmentOutlined, CreditCardOutlined,
  CheckCircleOutlined, UserOutlined, PhoneOutlined, MailOutlined
} from '@ant-design/icons';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrderContext';
import AppLayout from './AppLayout';
import './CheckoutPage.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CheckoutPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [deliveryAreas, setDeliveryAreas] = useState([]);
  const [branches, setBranches] = useState([]);
  const [orderCalculation, setOrderCalculation] = useState(null);
  const [orderType, setOrderType] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { addOrder } = useOrders();

  useEffect(() => {
    fetchBranches();
    fetchDeliveryAreas();
  }, []);

  useEffect(() => {
    if (cartItems.length > 0) {
      // Calculate initial total without delivery fee
      setOrderCalculation({
        subtotal: getCartTotal(),
        delivery_fee: 0,
        total: getCartTotal()
      });
    }
  }, [cartItems, orderType, getCartTotal]);

  const fetchBranches = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      const response = await fetch(`${apiUrl}/branches?include_inactive=false`);
      const data = await response.json();
      
      console.log('🏪 Branches API Response:', data);
      
      if (data.success) {
        const branchesData = data.data?.data || data.data || [];
        console.log('🏪 Branches Data:', branchesData);
        setBranches(branchesData);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      message.error('Failed to load branches');
    }
  };

  const fetchDeliveryAreas = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      const response = await fetch(`${apiUrl}/delivery-areas?active_only=true`);
      const data = await response.json();
      
      if (data.success) {
        setDeliveryAreas(data.data || []);
      } else {
        // Fallback to mock data if API fails
        console.warn('Delivery areas API failed, using mock data');
        setDeliveryAreas([
          { id: 1, name_en: 'Zone 1 - City Center', name_ar: 'المنطقة 1 - وسط المدينة', delivery_fee: 3.00 },
          { id: 2, name_en: 'Zone 2 - Suburbs', name_ar: 'المنطقة 2 - الضواحي', delivery_fee: 5.00 },
          { id: 3, name_en: 'Zone 3 - Extended Area', name_ar: 'المنطقة 3 - المنطقة الممتدة', delivery_fee: 8.00 },
          { id: 4, name_en: 'Zone 4 - Mountain Area', name_ar: 'المنطقة 4 - منطقة الجبل', delivery_fee: 10.00 },
          { id: 5, name_en: 'Zone 5 - Coastal Area', name_ar: 'المنطقة 5 - المنطقة الساحلية', delivery_fee: 7.00 }
        ]);
      }
    } catch (error) {
      console.error('Error fetching delivery areas:', error);
      // Fallback to mock data
      setDeliveryAreas([
        { id: 1, name_en: 'Zone 1 - City Center', name_ar: 'المنطقة 1 - وسط المدينة', delivery_fee: 3.00 },
        { id: 2, name_en: 'Zone 2 - Suburbs', name_ar: 'المنطقة 2 - الضواحي', delivery_fee: 5.00 },
        { id: 3, name_en: 'Zone 3 - Extended Area', name_ar: 'المنطقة 3 - المنطقة الممتدة', delivery_fee: 8.00 },
        { id: 4, name_en: 'Zone 4 - Mountain Area', name_ar: 'المنطقة 4 - منطقة الجبل', delivery_fee: 10.00 },
        { id: 5, name_en: 'Zone 5 - Coastal Area', name_ar: 'المنطقة 5 - المنطقة الساحلية', delivery_fee: 7.00 }
      ]);
    }
  };

  const calculateOrderTotal = async () => {
    try {
      const formValues = form.getFieldsValue();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      
      console.log('💰 Calculating order total with values:', formValues);
      
      // Calculate basic subtotal
      const subtotal = getCartTotal();
      console.log('🧮 Subtotal:', subtotal);
      
      // If not delivery type, no delivery fee
      if (orderType !== 'delivery') {
        setOrderCalculation({
          subtotal,
          delivery_fee: 0,
          total: subtotal
        });
        console.log('🚚 Not delivery - no delivery fee');
        return;
      }
      
      // For delivery orders, calculate delivery fee
      let deliveryFee = 0;
      
      if (formValues.area_id) {
        // Find the selected area and get its delivery fee
        const selectedArea = deliveryAreas.find(area => area.id == formValues.area_id);
        if (selectedArea) {
          deliveryFee = selectedArea.delivery_fee || 0;
          console.log('📍 Found area:', selectedArea.name_en, 'Fee:', deliveryFee);
        } else {
          console.log('⚠️ Area not found in local data, trying API...');
          
          // Try API calculation as fallback
          try {
            const orderData = {
              items: cartItems.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.price
              })),
              order_type: orderType,
              is_guest: true,
              guest_delivery_address: {
                address: formValues.address || 'Guest Address',
                area_id: formValues.area_id
              }
            };

            const response = await fetch(`${apiUrl}/orders/calculate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(orderData)
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                deliveryFee = data.data.delivery_fee || 5.00;
                console.log('✅ API delivery fee:', deliveryFee);
              }
            }
          } catch (apiError) {
            console.log('⚠️ API failed, using default delivery fee');
            deliveryFee = 5.00;
          }
        }
      } else {
        console.log('📍 No area selected yet');
        deliveryFee = 0; // No fee until area is selected
      }
      
      const total = subtotal + deliveryFee;
      
      const calculatedData = {
        subtotal,
        delivery_fee: deliveryFee,
        total
      };
      
      console.log('💰 Final calculation:', calculatedData);
      setOrderCalculation(calculatedData);
      
    } catch (error) {
      console.error('❌ Error calculating order total:', error);
      // Fallback calculation
      const fallbackSubtotal = getCartTotal();
      const fallbackDeliveryFee = orderType === 'delivery' ? 5.00 : 0;
      const fallbackTotal = fallbackSubtotal + fallbackDeliveryFee;
      
      setOrderCalculation({
        subtotal: fallbackSubtotal,
        delivery_fee: fallbackDeliveryFee,
        total: fallbackTotal
      });
      console.log('� Using fallback calculation');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price || 0);
  };

  const handlePlaceOrder = async (values) => {
    try {
      console.log('🛍️ Placing order with values:', values);
      console.log('📋 Cart items:', cartItems);
      
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      
      // Validate required fields
      if (!values.customer_name || !values.customer_phone || !values.branch_id) {
        message.error('Please fill in all required fields');
        return;
      }
      
      if (orderType === 'delivery' && (!values.address || !values.area_id)) {
        message.error('Please provide delivery address and area');
        return;
      }
      
      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        })),
        branch_id: values.branch_id,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email,
        order_type: orderType,
        payment_method: paymentMethod,
        special_instructions: values.special_instructions,
        is_guest: true,
        guest_delivery_address: orderType === 'delivery' ? {
          address: values.address,
          area_id: values.area_id,
          notes: values.address_notes
        } : null
      };

      console.log('📤 Sending order data:', orderData);

      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      console.log('📥 Order response:', data);
      
      if (data.success) {
        // Save order to localStorage
        const orderToSave = {
          id: data.data?.order?.id || data.data?.id || `order_${Date.now()}`,
          order_number: data.data?.order?.order_number || data.data?.order_number || `ORD${Date.now()}`,
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          customer_email: values.customer_email,
          order_type: orderType,
          branch_id: values.branch_id,
          items: cartItems.map(item => ({
            product_id: item.id,
            name: item.title,
            quantity: item.quantity,
            unit_price: item.price,
            total: item.price * item.quantity
          })),
          subtotal: orderCalculation?.subtotal || getCartTotal(),
          delivery_fee: orderCalculation?.delivery_fee || 0,
          total: orderCalculation?.total || getCartTotal(),
          status: 'pending',
          created_at: new Date().toISOString(),
          delivery_address: orderType === 'delivery' ? values.address : null,
          payment_method: paymentMethod,
          special_instructions: values.special_instructions || ''
        };
        
        // Add to order history
        addOrder(orderToSave);
        
        // Handle payment method
        if (paymentMethod === 'card') {
          // Redirect to MPGS payment for credit card
          message.success(`Order created! Redirecting to secure payment...`);
          clearCart();
          
          // Redirect to MPGS payment page
          const paymentUrl = `${apiUrl}/payments/mpgs/payment/view?orders_id=${data.data?.order?.id || data.data?.id}`;
          window.location.href = paymentUrl;
        } else {
          // Cash on delivery flow
          message.success(`Order placed successfully! Order #${data.data?.order?.order_number || data.data?.order_number || data.data?.id}`);
          clearCart();
          setCurrentStep(3); // Success step
        }
      } else {
        throw new Error(data.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('❌ Error placing order:', error);
      message.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Order Details',
      icon: <ShoppingCartOutlined />,
    },
    {
      title: 'Customer Info',
      icon: <UserOutlined />,
    },
    {
      title: 'Payment',
      icon: <CreditCardOutlined />,
    },
    {
      title: 'Complete',
      icon: <CheckCircleOutlined />,
    },
  ];

  const OrderSummary = () => (
    <Card title="Order Summary" className="checkout-order-summary">
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {cartItems.map((item) => (
          <div key={item.id} className="checkout-item">
            <div className="checkout-item-details">
              <Text strong>{item.title}</Text>
              <Text type="secondary"> x{item.quantity}</Text>
            </div>
            <Text>{formatPrice(item.price * item.quantity)}</Text>
          </div>
        ))}
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div className="checkout-item">
          <Text>Subtotal:</Text>
          <Text>{formatPrice(getCartTotal())}</Text>
        </div>
        
        {orderCalculation && (
          <>
            <div className="checkout-item">
              <Text>Delivery Fee:</Text>
              <Text>{formatPrice(orderCalculation.delivery_fee)}</Text>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <div className="checkout-item">
              <Text strong style={{ fontSize: '16px' }}>Total:</Text>
              <Text strong style={{ fontSize: '16px', color: '#229A95' }}>
                {formatPrice(orderCalculation.total)}
              </Text>
            </div>
          </>
        )}
      </Space>
    </Card>
  );

  // Only show empty cart message if cart is empty AND we're not on the success step
  if (cartItems.length === 0 && currentStep !== 3) {
    return (
      <AppLayout>
        <div className="checkout-empty">
          <Card>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <ShoppingCartOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
              <Title level={3}>Your cart is empty</Title>
              <Paragraph>Add some items to your cart before checkout.</Paragraph>
              <Button type="primary" href="/products">Continue Shopping</Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="checkout-page">
        <div className="checkout-container">
          <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
            Checkout
          </Title>
          
          <Steps current={currentStep} items={steps} className="checkout-steps" />
          
          {/* Success Step Content */}
          {currentStep === 3 && (
            <div style={{ marginTop: '32px' }}>
              <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
                  <Title level={3}>Order Placed Successfully!</Title>
                  <Paragraph>Your order has been submitted and is being processed.</Paragraph>
                  <Space direction="vertical" size="large" style={{ marginTop: '24px' }}>
                    <Button type="primary" href="/products" size="large">
                      Continue Shopping
                    </Button>
                    <Button href="/orders" size="large">
                      View My Orders
                    </Button>
                  </Space>
                </div>
              </Card>
            </div>
          )}
          
          {/* Form Content - Only show if not on success step */}
          {currentStep !== 3 && (
            <Row gutter={24} style={{ marginTop: '32px' }}>
              <Col xs={24} lg={16}>
                <Card className="checkout-form-card">
                  <Form
                    form={form}
                    layout="vertical"
                  onFinish={handlePlaceOrder}
                  onChange={calculateOrderTotal}
                >
                  {/* Order Type Selection */}
                  <div className="checkout-section">
                    <Title level={4}>Order Type</Title>
                    <Radio.Group
                      value={orderType}
                      onChange={(e) => {
                        setOrderType(e.target.value);
                        setTimeout(calculateOrderTotal, 100);
                      }}
                      style={{ width: '100%' }}
                    >
                      <Radio.Button value="delivery" style={{ width: '50%', textAlign: 'center' }}>
                        🚚 Delivery
                      </Radio.Button>
                      <Radio.Button value="pickup" style={{ width: '50%', textAlign: 'center' }}>
                        🏪 Pickup
                      </Radio.Button>
                    </Radio.Group>
                  </div>

                  {/* Customer Information */}
                  <div className="checkout-section">
                    <Title level={4}>Customer Information</Title>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="customer_name"
                          label="Full Name"
                          rules={[{ required: true, message: 'Please enter your name' }]}
                        >
                          <Input prefix={<UserOutlined />} placeholder="Your full name" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="customer_phone"
                          label="Phone Number"
                          rules={[{ required: true, message: 'Please enter your phone number' }]}
                        >
                          <Input prefix={<PhoneOutlined />} placeholder="Your phone number" />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Form.Item
                      name="customer_email"
                      label="Email (Optional)"
                    >
                      <Input prefix={<MailOutlined />} placeholder="your@email.com" />
                    </Form.Item>
                  </div>

                  {/* Branch Selection */}
                  <div className="checkout-section">
                    <Title level={4}>Branch</Title>
                    <Form.Item
                      name="branch_id"
                      label="Select Branch"
                      rules={[{ required: true, message: 'Please select a branch' }]}
                    >
                      <select 
                        className="ant-select ant-select-lg ant-select-single ant-select-show-arrow"
                        style={{ width: '100%', height: '44px', padding: '0 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
                        onChange={(e) => {
                          form.setFieldsValue({ branch_id: e.target.value });
                          calculateOrderTotal();
                        }}
                        value={form.getFieldValue('branch_id')}
                      >
                        <option value="">Choose a branch</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>
                            {branch.title_en || branch.title_ar || branch.name_en || branch.name || `Branch ${branch.id}`}
                            {(branch.address_en || branch.address_ar || branch.address) && 
                              ` - ${branch.address_en || branch.address_ar || branch.address}`}
                          </option>
                        ))}
                      </select>
                    </Form.Item>
                  </div>

                  {/* Delivery Address (if delivery) */}
                  {orderType === 'delivery' && (
                    <div className="checkout-section">
                      <Title level={4}>Delivery Address</Title>
                      <Form.Item
                        name="area_id"
                        label="Area"
                        rules={[{ required: true, message: 'Please select delivery area' }]}
                      >
                        <select
                          className="ant-select ant-select-lg ant-select-single ant-select-show-arrow"
                          style={{ width: '100%', height: '44px', padding: '0 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
                          onChange={(e) => {
                            const areaId = e.target.value;
                            console.log('🏘️ Area selected:', areaId);
                            form.setFieldsValue({ area_id: areaId });
                            // Trigger calculation immediately
                            calculateOrderTotal();
                          }}
                          value={form.getFieldValue('area_id')}
                        >
                          <option value="">Select delivery area</option>
                          {deliveryAreas.map(area => (
                            <option key={area.id} value={area.id}>
                              {area.name_en || area.name} - {formatPrice(area.delivery_fee)}
                            </option>
                          ))}
                        </select>
                      </Form.Item>
                      
                      <Form.Item
                        name="address"
                        label="Detailed Address"
                        rules={[{ required: true, message: 'Please enter your address' }]}
                      >
                        <TextArea 
                          prefix={<EnvironmentOutlined />} 
                          placeholder="Building, street, area details..."
                          rows={3}
                        />
                      </Form.Item>
                      
                      <Form.Item
                        name="address_notes"
                        label="Address Notes (Optional)"
                      >
                        <Input placeholder="Landmark, floor, apartment number..." />
                      </Form.Item>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div className="checkout-section">
                    <Title level={4}>Payment Method</Title>
                    <Radio.Group
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <Space direction="vertical">
                        <Radio value="cash">💵 Cash on Delivery</Radio>
                        <Radio value="card">💳 Credit Card (Secure Payment)</Radio>
                      </Space>
                    </Radio.Group>
                  </div>

                  {/* Special Instructions */}
                  <div className="checkout-section">
                    <Form.Item
                      name="special_instructions"
                      label="Special Instructions (Optional)"
                    >
                      <TextArea 
                        placeholder="Any special requests or notes for your order..."
                        rows={3}
                      />
                    </Form.Item>
                  </div>

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    style={{ 
                      width: '100%', 
                      height: '50px',
                      backgroundColor: '#229A95',
                      borderColor: '#229A95'
                    }}
                  >
                    Place Order {orderCalculation && `- ${formatPrice(orderCalculation.total)}`}
                  </Button>
                </Form>
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <OrderSummary />
            </Col>
          </Row>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CheckoutPage;
