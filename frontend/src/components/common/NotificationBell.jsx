import { useState, useEffect } from 'react'
import { Badge, Button, Popover, List, Typography, Space, Empty, Spin } from 'antd'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import notificationsService from '../../services/notificationsService'
import { useLanguage } from '../../contexts/LanguageContext'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Text } = Typography

const NotificationBell = () => {
  const { language, isRTL } = useLanguage()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Poll for notifications every 30 seconds
  useEffect(() => {
    loadUnreadCount()
    loadRecentNotifications()

    const interval = setInterval(() => {
      loadUnreadCount()
      if (popoverOpen) {
        loadRecentNotifications()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [popoverOpen])

  const loadUnreadCount = async () => {
    try {
      // This would need to be implemented in the backend for admin users
      // For now, we'll simulate admin notifications
      const response = await notificationsService.getAllNotifications({
        limit: 1,
        page: 1
      })
      
      // Simulate unread count from recent notifications
      setUnreadCount(Math.min(response.pagination?.total || 0, 99))
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const loadRecentNotifications = async () => {
    try {
      setLoading(true)
      const response = await notificationsService.getAllNotifications({
        limit: 10,
        page: 1
      })
      setNotifications(response.data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePopoverOpenChange = (open) => {
    setPopoverOpen(open)
    if (open) {
      loadRecentNotifications()
    }
  }

  const notificationContent = (
    <div style={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Text strong>
          {language === 'ar' ? 'الإشعارات الحديثة' : 'Recent Notifications'}
        </Text>
        <Link to="/notifications">
          <Button type="link" size="small">
            {language === 'ar' ? 'عرض الكل' : 'View All'}
          </Button>
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
          />
        </div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={notifications.slice(0, 5)}
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 16px' }}>
              <List.Item.Meta
                title={
                  <div style={{ fontSize: '14px' }}>
                    {language === 'ar' ? item.title_ar : item.title_en}
                  </div>
                }
                description={
                  <div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      marginBottom: '4px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {language === 'ar' ? item.message_ar : item.message_en}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {dayjs(item.created_at).fromNow()}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      {notifications.length > 5 && (
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid #f0f0f0',
          textAlign: 'center'
        }}>
          <Link to="/notifications">
            <Button type="link">
              {language === 'ar' ? 
                `عرض جميع الإشعارات (${notifications.length})` : 
                `View All Notifications (${notifications.length})`
              }
            </Button>
          </Link>
        </div>
      )}
    </div>
  )

  return (
    <Popover
      content={notificationContent}
      title={null}
      trigger="click"
      placement={isRTL ? 'bottomLeft' : 'bottomRight'}
      open={popoverOpen}
      onOpenChange={handlePopoverOpenChange}
      overlayStyle={{ zIndex: 1050 }}
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined style={{ fontSize: '18px' }} />}
          style={{ 
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
      </Badge>
    </Popover>
  )
}

export default NotificationBell
