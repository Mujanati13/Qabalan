import React, { useState, useEffect } from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  List,
  Avatar,
  Badge,
  Typography,
  Space,
  Button,
  Tag,
  Progress,
  Spin,
  message
} from 'antd';
import {
  BellOutlined,
  SendOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  RightOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import notificationsService from '../../services/notificationsService';
import { useLanguage } from '../../contexts/LanguageContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const NotificationsDashboardWidget = ({ 
  height = 400,
  showRecentList = true,
  showStatistics = true,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const { language, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Auto refresh data
  useEffect(() => {
    loadData();
    
    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadData = async () => {
    await Promise.all([
      showStatistics && loadStatistics(),
      showRecentList && loadRecentNotifications()
    ]);
  };

  const loadStatistics = async () => {
    try {
      setStatsLoading(true);
      const response = await notificationsService.getStatistics(7); // Last 7 days
      setStatistics(response.data);
    } catch (error) {
      console.error('Failed to load notification statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadRecentNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsService.getAllNotifications({
        page: 1,
        limit: 5
      });
      setRecentNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to load recent notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    message.loading({ content: language === 'ar' ? 'جاري التحديث...' : 'Refreshing...', key: 'refresh' });
    loadData().then(() => {
      message.success({ 
        content: language === 'ar' ? 'تم التحديث بنجاح' : 'Refreshed successfully', 
        key: 'refresh',
        duration: 2
      });
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return <BellOutlined style={{ color: '#1890ff' }} />;
      case 'promotion':
        return <SendOutlined style={{ color: '#52c41a' }} />;
      case 'system':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <BellOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStatusColor = (is_read) => {
    return is_read ? '#52c41a' : '#faad14';
  };

  return (
    <Card
      title={
        <Space>
          <BellOutlined />
          <span>{language === 'ar' ? 'إدارة الإشعارات' : 'Notifications Overview'}</span>
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            size="small" 
            onClick={handleRefresh}
            loading={statsLoading || loading}
          >
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
          <Link to="/notifications">
            <Button 
              type="primary" 
              size="small" 
              icon={<RightOutlined />}
            >
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </Button>
          </Link>
        </Space>
      }
      bodyStyle={{ height: height - 57, overflow: 'auto' }}
    >
      {showStatistics && (
        <div style={{ marginBottom: '16px' }}>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
            </div>
          ) : statistics ? (
            <>
              {/* Quick Stats Row */}
              <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
                <Col span={6}>
                  <Statistic
                    title={language === 'ar' ? 'إجمالي' : 'Total'}
                    value={statistics.overview?.total_notifications || 0}
                    prefix={<BellOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={language === 'ar' ? 'مرسل' : 'Sent'}
                    value={statistics.overview?.total_sent || 0}
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={language === 'ar' ? 'مقروء' : 'Read'}
                    value={statistics.overview?.read_notifications || 0}
                    prefix={<EyeOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={language === 'ar' ? 'فشل' : 'Failed'}
                    value={statistics.overview?.failed_deliveries || 0}
                    prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
              </Row>

              {/* Read Rate Progress */}
              <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ fontSize: '12px' }}>
                  {language === 'ar' ? 'معدل القراءة' : 'Read Rate'}
                </Text>
                <Progress 
                  percent={Math.round(
                    (statistics.overview?.read_notifications / 
                    (statistics.overview?.total_notifications || 1)) * 100
                  )}
                  size="small"
                  strokeColor="#52c41a"
                  showInfo={false}
                />
              </div>
            </>
          ) : null}
        </div>
      )}

      {showRecentList && (
        <div>
          <Title level={5} style={{ marginBottom: '12px' }}>
            {language === 'ar' ? 'الإشعارات الحديثة' : 'Recent Notifications'}
          </Title>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
            </div>
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={recentNotifications}
              locale={{
                emptyText: language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'
              }}
              renderItem={(item) => (
                <List.Item
                  style={{ 
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={!item.is_read} offset={[-5, 5]}>
                        <Avatar 
                          icon={getNotificationIcon(item.type)}
                          size="small"
                          style={{ backgroundColor: '#f5f5f5' }}
                        />
                      </Badge>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text 
                          strong={!item.is_read}
                          style={{ 
                            fontSize: '12px',
                            color: item.is_read ? '#8c8c8c' : '#262626'
                          }}
                        >
                          {language === 'ar' ? item.title_ar : item.title_en}
                        </Text>
                        <Tag 
                          color={
                            item.type === 'order' ? 'blue' : 
                            item.type === 'promotion' ? 'green' : 
                            'orange'
                          }
                          style={{ fontSize: '10px', lineHeight: '14px' }}
                        >
                          {item.type}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <Text 
                          type="secondary" 
                          style={{ 
                            fontSize: '11px',
                            display: 'block',
                            marginBottom: '4px'
                          }}
                        >
                          {language === 'ar' ? item.message_ar : item.message_en}
                        </Text>
                        <Text 
                          type="secondary" 
                          style={{ fontSize: '10px' }}
                        >
                          {dayjs(item.created_at).fromNow()}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      )}
    </Card>
  );
};

export default NotificationsDashboardWidget;
