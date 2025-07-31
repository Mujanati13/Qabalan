import React from 'react';
import { Badge } from 'antd';
import { useNotifications } from '../../contexts/NotificationContext';

const OrdersBadge = ({ children, showZero = false, size = 'default' }) => {
  const { pendingOrdersCount, isInitialized } = useNotifications();

  // Don't show badge if not initialized yet
  if (!isInitialized) {
    return children;
  }

  return (
    <Badge 
      count={pendingOrdersCount} 
      showZero={showZero}
      size={size}
      style={{
        backgroundColor: '#ff4d4f',
        boxShadow: '0 0 0 1px #d9d9d9 inset'
      }}
      offset={[50, 0]}
    >
      {children}
    </Badge>
  );
};

export default OrdersBadge;
