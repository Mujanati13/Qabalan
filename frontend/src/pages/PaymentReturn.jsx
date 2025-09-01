import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Result, Button, Spin, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import paymentsService from '../services/paymentsService';

const PaymentReturn = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        setLoading(true);
        
        // Get parameters from URL
        const resultIndicator = searchParams.get('resultIndicator');
        const sessionId = searchParams.get('sessionId');
        const orderId = searchParams.get('orderId');
        
        console.log('Payment return params:', { resultIndicator, sessionId, orderId });

        if (!resultIndicator || !sessionId) {
          throw new Error('Missing payment result parameters');
        }

        // Call backend to complete payment verification
        const response = await paymentsService.completeMPGSPayment({
          resultIndicator,
          sessionId,
          orderId
        });

        console.log('Payment completion response:', response);

        if (response.success) {
          setPaymentResult({
            status: 'success',
            orderId: response.orderId,
            transactionId: response.transactionId,
            amount: response.amount
          });
          message.success(t('orders.payment_success'));
        } else {
          setPaymentResult({
            status: 'failed',
            orderId: orderId,
            error: response.error || 'Payment verification failed'
          });
          message.error(t('orders.payment_error'));
        }
      } catch (err) {
        console.error('Payment processing error:', err);
        setError(err.message || 'An error occurred while processing payment');
        setPaymentResult({
          status: 'error',
          error: err.message
        });
        message.error(t('orders.payment_error'));
      } finally {
        setLoading(false);
      }
    };

    processPaymentResult();
  }, [searchParams, t]);

  const handleReturnToOrders = () => {
    navigate('/orders');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '60vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, fontSize: '16px', color: '#666' }}>
          {t('orders.payment_processing')}
        </div>
      </div>
    );
  }

  const getResultContent = () => {
    if (!paymentResult) {
      return {
        status: 'error',
        title: t('orders.payment_error'),
        subTitle: 'Unknown payment status',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      };
    }

    switch (paymentResult.status) {
      case 'success':
        return {
          status: 'success',
          title: t('orders.payment_success'),
          subTitle: paymentResult.orderId 
            ? `Order #${paymentResult.orderId} has been paid successfully`
            : 'Your payment has been processed successfully',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
        };
      
      case 'failed':
        return {
          status: 'error',
          title: t('orders.payment_error'),
          subTitle: paymentResult.error || 'Payment could not be completed',
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
        };
      
      case 'cancelled':
        return {
          status: 'warning',
          title: t('orders.payment_cancelled'),
          subTitle: 'Payment was cancelled by user',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />
        };
      
      default:
        return {
          status: 'error',
          title: t('orders.payment_error'),
          subTitle: 'Unknown payment status',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />
        };
    }
  };

  const resultContent = getResultContent();

  return (
    <div style={{ 
      minHeight: '60vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card style={{ maxWidth: 500, width: '100%' }}>
        <Result
          icon={resultContent.icon}
          title={resultContent.title}
          subTitle={resultContent.subTitle}
          extra={[
            <Button 
              type="primary" 
              key="return" 
              onClick={handleReturnToOrders}
              size="large"
            >
              {t('orders.return_to_orders')}
            </Button>
          ]}
        />
        
        {paymentResult && paymentResult.orderId && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: 20, 
            padding: 16,
            backgroundColor: '#f5f5f5',
            borderRadius: 8
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: 8 }}>
              Order Details
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Order #{paymentResult.orderId}
            </div>
            {paymentResult.transactionId && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                Transaction ID: {paymentResult.transactionId}
              </div>
            )}
            {paymentResult.amount && (
              <div style={{ fontSize: '14px', color: '#52c41a', marginTop: 8 }}>
                Amount: {paymentResult.amount} JOD
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            backgroundColor: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 6,
            fontSize: '14px',
            color: '#a8071a'
          }}>
            Error: {error}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PaymentReturn;
