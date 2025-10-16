import { useState, useEffect, useRef } from 'react'
import { Badge, Button, Popover, List, Typography, Space, Empty, Spin, message } from 'antd'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import notificationsService from '../../services/notificationsService'
import api from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import io from 'socket.io-client'

dayjs.extend(relativeTime)

const { Text } = Typography

const NotificationBell = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [isNewNotification, setIsNewNotification] = useState(false)
  const socketRef = useRef(null)

  // Set up socket connection for real-time notifications
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3015'
    
    // Initialize socket connection
    socketRef.current = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    // Listen for new support tickets
    socketRef.current.on('newSupportTicket', (ticketData) => {
      console.log('🎫 New support ticket received:', ticketData)
      
      // Show notification message
      message.success({
        content: language === 'ar' ? 
          `تذكرة دعم جديدة: #${ticketData.ticketNumber}` :
          `New Support Ticket: #${ticketData.ticketNumber}`,
        duration: 4,
        style: { marginTop: '60px' }
      })
      
      // Visual feedback
      setIsNewNotification(true)
      setTimeout(() => setIsNewNotification(false), 3000)
      
      // Play notification sound
      playNotificationSound()
      
      // Refresh notifications
      loadUnreadCount()
      if (popoverOpen) {
        loadRecentNotifications()
      }
    })

    // Listen for new support replies
    socketRef.current.on('newSupportReply', (replyData) => {
      console.log('💬 New support reply received:', replyData)
      
      // Show notification message
      message.info({
        content: language === 'ar' ? 
          `رد جديد على التذكرة: #${replyData.ticketNumber}` :
          `New Reply on Ticket: #${replyData.ticketNumber}`,
        duration: 4,
        style: { marginTop: '60px' }
      })
      
      // Visual feedback
      setIsNewNotification(true)
      setTimeout(() => setIsNewNotification(false), 3000)
      
      // Play notification sound
      playNotificationSound()
      
      // Refresh notifications
      loadUnreadCount()
      if (popoverOpen) {
        loadRecentNotifications()
      }
    })

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [popoverOpen])

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3')
      audio.volume = 0.3
      audio.play().catch(console.error)
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  // Poll for notifications every 30 seconds (backup to real-time)
  useEffect(() => {
    loadUnreadCount()
    loadRecentNotifications()

    // Reduced polling frequency since we have real-time updates
    const interval = setInterval(() => {
      loadUnreadCount()
      if (popoverOpen) {
        loadRecentNotifications()
      }
    }, 60000) // Check every minute as backup

    return () => clearInterval(interval)
  }, [popoverOpen])

  const loadUnreadCount = async () => {
    try {
      console.log('🔔 Loading unread count...')
      
      // Load admin notifications (user_id = null) - get only UNREAD notifications for count
      const notificationsResponse = await api.get('/notifications', {
        params: { 
          limit: 1,
          page: 1,
          admin: true,
          unread_only: true // Only count unread notifications
        }
      })
      
      console.log('📊 Full API response:', notificationsResponse.data)
      console.log('📊 Pagination object:', JSON.stringify(notificationsResponse.data?.pagination, null, 2))
      
      const unreadNotificationsCount = notificationsResponse.data?.pagination?.total || 0
      
      console.log(`📈 Raw count from API: ${unreadNotificationsCount}`)
      console.log(`📈 Will display (capped at 99): ${Math.min(unreadNotificationsCount, 99)}`)
      
      // Set the unread count
      setUnreadCount(Math.min(unreadNotificationsCount, 99))
      
      console.log(`✅ Badge now showing: ${Math.min(unreadNotificationsCount, 99)} notifications`)
      
      if (unreadNotificationsCount > 99) {
        console.warn(`⚠️ Actual unread count is ${unreadNotificationsCount}, but displaying 99 (badge limit)`)
      }
    } catch (error) {
      console.error('❌ Error loading unread count:', error)
      console.error('❌ Error details:', error.response?.data)
      setUnreadCount(0)
    }
  }

  const loadRecentNotifications = async () => {
    try {
      setLoading(true)
      console.log('📋 Loading recent notifications...')
      
      // Load ALL admin notifications (user_id = null) - all types
      const notificationsResponse = await api.get('/notifications', {
        params: { 
          limit: 50, // Increased to get more notifications
          page: 1,
          admin: true
          // No type filter - get ALL types: order, support, general, promotion, system
        }
      })
      
      console.log('📨 Admin notifications response:', notificationsResponse.data)
      
      const adminNotifications = notificationsResponse.data?.data || []
      
      console.log('📊 Processing data:', {
        adminNotifications: adminNotifications.length,
        types: [...new Set(adminNotifications.map(n => n.type))]
      })
      
      // Transform admin notifications
      let notifications = adminNotifications.map(notification => {
        console.log('🔧 Processing notification:', {
          id: notification.id,
          type: notification.type,
          is_read: notification.is_read,
          created_at: notification.created_at
        })
        return {
          ...notification,
          isDbNotification: true
        }
      })
      
      // Sort by date (newest first)
      notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      console.log(`✅ Loaded ${notifications.length} notifications of types:`, 
        [...new Set(notifications.map(n => n.type))])
      
      setNotifications(notifications.slice(0, 10))
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark a single notification as read
  const markAsRead = async (notificationId) => {
    try {
      console.log('📝 Marking notification as read:', notificationId)
      const response = await api.post(`/notifications/${notificationId}/read`)
      console.log('✅ Mark as read response:', response.data)
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date() } : n)
      )
      
      // Refresh unread count
      await loadUnreadCount()
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
      console.error('Error details:', error.response?.data)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Mark all unread notifications
      const unreadNotifications = notifications.filter(n => n.isDbNotification && !n.is_read)
      
      await Promise.all(
        unreadNotifications.map(n => api.post(`/notifications/${n.id}/read`))
      )
      
      message.success(
        language === 'ar' ? 
          'تم وضع علامة مقروء على جميع الإشعارات' : 
          'All notifications marked as read'
      )
      
      // Refresh notifications and count
      await loadRecentNotifications()
      await loadUnreadCount()
    } catch (error) {
      console.error('Error marking all as read:', error)
      message.error(
        language === 'ar' ? 
          'فشل في تحديث الإشعارات' : 
          'Failed to update notifications'
      )
    }
  }

  // Handle notification click to navigate to the related item
  const handleNotificationClick = async (notification) => {
    console.log('🔔 Notification clicked:', notification)
    
    // Mark as read if it's a database notification and unread
    if (notification.isDbNotification && !notification.is_read) {
      console.log('📝 Attempting to mark as read...')
      await markAsRead(notification.id)
    } else {
      console.log('⏭️ Skip marking (isDb:', notification.isDbNotification, 'is_read:', notification.is_read, ')')
    }

    setPopoverOpen(false)
    
    const isSupport = notification.type === 'support_ticket' || notification.type === 'support'
    const isDbNotification = notification.isDbNotification
    
    if (isSupport) {
      // Get ticket ID from notification
      let ticketId
      if (isDbNotification && notification.data?.ticket_id) {
        ticketId = notification.data.ticket_id
      } else if (notification.ticket_id) {
        ticketId = notification.ticket_id
      }
      
      if (ticketId) {
        // Navigate to Support page and open ticket details
        navigate('/support', { 
          state: { 
            openTicketId: ticketId,
            highlightTicket: true 
          } 
        })
      } else {
        // Fallback to support page
        navigate('/support')
      }
    } else if (notification.type === 'order') {
      // Navigate to Orders page
      const orderId = notification.data?.order_id || notification.order_id
      if (orderId) {
        navigate('/orders', { 
          state: { 
            openOrderId: orderId,
            highlightOrder: true 
          } 
        })
      } else {
        navigate('/orders')
      }
    } else if (notification.type === 'promotion' || notification.type === 'promo') {
      // Navigate to Promotions page
      navigate('/promotions')
    } else if (notification.type === 'general' || notification.type === 'system') {
      // Navigate to notifications page for general notifications
      navigate('/notifications?tab=notifications')
    } else {
      // Default fallback to notifications page
      navigate('/notifications?tab=notifications')
    }
  }

  const handlePopoverOpenChange = (open) => {
    setPopoverOpen(open)
    if (open) {
      setIsNewNotification(false) // Clear visual feedback when opened
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
        <Space size="small">
          {notifications.some(n => n.isDbNotification && !n.is_read) && (
            <Button 
              type="link" 
              size="small" 
              icon={<CheckOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                markAllAsRead()
              }}
            >
              {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
            </Button>
          )}
          <Button 
            type="link" 
            size="small"
            onClick={() => {
              setPopoverOpen(false)
              navigate('/notifications?tab=notifications')
            }}
          >
            {language === 'ar' ? 'عرض الكل' : 'View All'}
          </Button>
        </Space>
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
          renderItem={(item) => {
            const isSupport = item.type === 'support_ticket' || item.type === 'support'
            const isDbNotification = item.isDbNotification
            
            let title, message, ticketId
            
            if (isDbNotification) {
              // Database notification
              title = language === 'ar' ? item.title_ar : item.title_en
              message = language === 'ar' ? item.message_ar : item.message_en
              ticketId = item.data?.ticket_id
            } else {
              // Fallback ticket-based notification
              title = item.title
              message = item.message
              ticketId = item.ticket_id
            }
            
            return (
              <List.Item 
                style={{ 
                  padding: '12px 16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  backgroundColor: item.isDbNotification && !item.is_read ? '#e6f7ff' : 'transparent',
                  borderLeft: item.isDbNotification && !item.is_read ? '3px solid #1890ff' : 'none',
                }}
                className="notification-item"
                onClick={() => handleNotificationClick(item)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = item.isDbNotification && !item.is_read ? '#e6f7ff' : 'transparent'
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ 
                      fontSize: '14px',
                      color: isSupport && item.priority === 'urgent' ? '#ff4d4f' :
                             isSupport && item.priority === 'high' ? '#fa8c16' : '#262626',
                      fontWeight: item.isDbNotification && !item.is_read ? '600' : 'normal'
                    }}>
                      {item.isDbNotification && !item.is_read && (
                        <Badge 
                          status="processing" 
                          style={{ marginRight: isRTL ? '0' : '6px', marginLeft: isRTL ? '6px' : '0' }} 
                        />
                      )}
                      {title}
                      {isSupport && item.category && (
                        <span style={{ 
                          marginLeft: '8px',
                          fontSize: '11px',
                          color: '#666',
                          fontWeight: 'normal'
                        }}>
                          ({item.category})
                        </span>
                      )}
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
                        {message}
                        {isSupport && item.customer_name && (
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            {language === 'ar' ? 'العميل: ' : 'Customer: '}{item.customer_name}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {dayjs(item.created_at).fromNow()}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )
          }}
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
            color: isNewNotification ? '#ff4d4f' : '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            transform: isNewNotification ? 'scale(1.1)' : 'scale(1)',
            backgroundColor: isNewNotification ? 'rgba(255, 77, 79, 0.1)' : 'transparent'
          }}
        />
      </Badge>
    </Popover>
  )
}

export default NotificationBell
