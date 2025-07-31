import React from 'react';
import { 
  Drawer, Card, Button, Typography, Space, InputNumber, 
  Empty, Divider, Badge, List, Image 
} from 'antd';
import { 
  ShoppingCartOutlined, DeleteOutlined, PlusOutlined, MinusOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import './CartDrawer.css';

const { Title, Text } = Typography;

const CartDrawer = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    cartVisible,
    setCartVisible,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemsCount
  } = useCart();

  const handleProceedToCheckout = () => {
    setCartVisible(false);
    navigate('/checkout');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity > 0) {
      updateCartItem(itemId, newQuantity);
    }
  };

  const CartItemCard = ({ item }) => (
    <Card 
      size="small" 
      className="cart-item-card"
      bodyStyle={{ padding: '12px' }}
    >
      <div className="cart-item-content">
        <div className="cart-item-image">
          {item.image ? (
            <Image
              src={`http://localhost:3015/uploads/products/${item.image}`}
              alt={item.title}
              width={60}
              height={60}
              style={{ objectFit: 'cover', borderRadius: '6px' }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1xUG8O+L4A2GnIAJSGjJEaWI4nRICwfAE7BBOmLICY5pJ/xpSpKwFPFNZNJQWoAJBJQPGOB73M4RdtZOHXBJtOJUPkp/5Z7X3m9qy1r/2+eiAAgICKAPCUgQOHoF8D8I1Q="
            />
          ) : (
            <div className="cart-item-no-image">
              <span>🥐</span>
            </div>
          )}
        </div>
        
        <div className="cart-item-details">
          <Text strong className="cart-item-title">
            {item.title}
          </Text>
          <Text className="cart-item-price">
            {formatPrice(item.price)}
          </Text>
          
          <div className="cart-item-controls">
            <div className="cart-item-quantity">
              <Button
                size="small"
                icon={<MinusOutlined />}
                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
              />
              <InputNumber
                size="small"
                min={1}
                max={99}
                value={item.quantity}
                onChange={(value) => handleQuantityChange(item.id, value)}
                style={{ width: '60px', margin: '0 4px' }}
              />
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
              />
            </div>
            
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeFromCart(item.id)}
              className="cart-item-remove"
            />
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <Drawer
      title={
        <div className="cart-drawer-header">
          <ShoppingCartOutlined style={{ marginRight: '8px' }} />
          Shopping Cart
          <Badge count={getCartItemsCount()} size="small" style={{ marginLeft: '8px' }} />
        </div>
      }
      placement="right"
      onClose={() => setCartVisible(false)}
      open={cartVisible}
      width={400}
      footer={
        cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-total">
              <Text strong style={{ fontSize: '18px' }}>
                Total: {formatPrice(getCartTotal())}
              </Text>
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Button 
                type="primary" 
                size="large" 
                block
                style={{ backgroundColor: '#229A95', borderColor: '#229A95' }}
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
              </Button>
              <Button 
                type="default" 
                size="large" 
                block 
                onClick={clearCart}
                danger
              >
                Clear Cart
              </Button>
            </Space>
          </div>
        )
      }
    >
      <div className="cart-drawer-content">
        {cartItems.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Your cart is empty"
            style={{ marginTop: '50px' }}
          >
            <Button type="primary" onClick={() => setCartVisible(false)}>
              Continue Shopping
            </Button>
          </Empty>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {cartItems.map((item) => (
              <CartItemCard key={`${item.id}-${JSON.stringify(item.options)}`} item={item} />
            ))}
            
            <Divider style={{ margin: '16px 0' }} />
            
            <div className="cart-summary">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div className="cart-summary-row">
                  <Text>Subtotal:</Text>
                  <Text strong>{formatPrice(getCartTotal())}</Text>
                </div>
                <div className="cart-summary-row">
                  <Text>Items:</Text>
                  <Text>{getCartItemsCount()}</Text>
                </div>
              </Space>
            </div>
          </Space>
        )}
      </div>
    </Drawer>
  );
};

export default CartDrawer;
