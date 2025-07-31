import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined, ShoppingOutlined } from '@ant-design/icons';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={[
          <Button 
            type="primary" 
            key="home" 
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Back Home
          </Button>,
          <Button 
            key="offers" 
            icon={<ShoppingOutlined />}
            onClick={() => navigate('/offer/1')}
          >
            View Offers
          </Button>
        ]}
      />
    </div>
  );
};

export default NotFound;
