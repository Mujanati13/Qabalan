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
      
      // Load admin notifications (user_id = null) - get ALL types for count
      const notificationsResponse = await api.get('/notifications', {
        params: { 
          limit: 1,
          page: 1,
          admin: true // Get all admin notifications, not just support
          // Removed type filter to get total count
        }
      })
      
      console.log('📊 Notifications response:', notificationsResponse.data)
      
      // Load recent support tickets (last 24 hours) for additional count
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const supportResponse = await api.get('/support/admin/tickets', {
        params: { 
          limit: 10,
          status: 'open,in_progress',
          createdAfter: yesterday.toISOString()
        }
      })
      
      console.log('🎫 Support response:', supportResponse.data)
      
      const generalNotificationsCount = notificationsResponse.data?.pagination?.total || 0
      const supportTicketsCount = supportResponse.data?.data?.tickets?.length || 0
      
      console.log(`📈 Counts - Notifications: ${generalNotificationsCount}, Support: ${supportTicketsCount}`)
      
      // For badge count, use only the database notifications count
      // Don't double count with support tickets since they should be in notifications
      setUnreadCount(Math.min(generalNotificationsCount, 99))
    } catch (error) {
      console.error('❌ Error loading unread count:', error)
      // Fallback: still show some count for demonstration
      setUnreadCount(0)
    }
  }

  const loadRecentNotifications = async () => {
    try {
      setLoading(true)
      console.log('📋 Loading recent notifications...')
      
      // Load ALL admin notifications (user_id = null) - not just support type
      const notificationsResponse = await api.get('/notifications', {
        params: { 
          limit: 10,
          page: 1,
          admin: true
          // Removed type filter to get all types of notifications
        }
      })
      
      console.log('📨 Admin notifications response:', notificationsResponse.data)
      
      // Load recent support tickets (last 24 hours) as backup if no DB notifications
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const supportResponse = await api.get('/support/admin/tickets', {
        params: { 
          limit: 10,
          sortBy: 'created_at',
          sortOrder: 'desc',
          status: 'open,in_progress',
          createdAfter: yesterday.toISOString()
        }
      })
      
      console.log('🎫 Support tickets response:', supportResponse.data)
      
      const adminNotifications = notificationsResponse.data?.data || []
      const supportTickets = supportResponse.data?.data?.tickets || []
      
      console.log('📊 Processing data:', {
        adminNotifications: adminNotifications.length,
        supportTickets: supportTickets.length
      })
      
      // Transform admin notifications if they exist
      let notifications = adminNotifications.map(notification => {
        console.log('🔧 Processing admin notification:', notification)
        return {
          ...notification,
          isDbNotification: true
        }
      })
      
      // Only use ticket fallback if NO database notifications exist at all
      if (notifications.length === 0) {
        console.log('🔄 No DB notifications found, using ticket fallback:', supportTickets.length)
        notifications = supportTickets.map(ticket => {
          let type = 'info'
          let priority = 'normal'
          
          if (ticket.priority === 'urgent') {
            type = 'error'
            priority = 'urgent'
          } else if (ticket.priority === 'high') {
            type = 'warning'
            priority = 'high'
          }
          
          return {
            id: `support-${ticket.id}`,
            type: 'support_ticket',
            title: language === 'ar' ? 
              (ticket.priority === 'urgent' ? 'تذكرة عاجلة' : 
               ticket.priority === 'high' ? 'تذكرة ذات أولوية عالية' : 
               'تذكرة دعم جديدة') :
              (ticket.priority === 'urgent' ? 'Urgent Ticket' : 
               ticket.priority === 'high' ? 'High Priority Ticket' : 
               'New Support Ticket'),
            message: `#${ticket.ticket_number}: ${ticket.subject}`,
            created_at: ticket.created_at,
            priority: priority,
            ticket_id: ticket.id,
            customer_name: `${ticket.user_first_name} ${ticket.user_last_name}`,
            category: ticket.category,
            isDbNotification: false
          }
        })
      } else {
        console.log(`✅ Found ${notifications.length} database notifications, using those`)
      }
      
      // Sort by date
      notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      console.log('✅ Final notifications:', notifications)
      setNotifications(notifications.slice(0, 10))
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle notification click to navigate to the related item
  const handleNotificationClick = (notification) => {
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
      navigate('/notifications')
    } else {
      // Default fallback to notifications page
      navigate('/notifications')
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
                }}
                className="notification-item"
                onClick={() => handleNotificationClick(item)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ 
                      fontSize: '14px',
                      color: isSupport && item.priority === 'urgent' ? '#ff4d4f' :
                             isSupport && item.priority === 'high' ? '#fa8c16' : '#262626'
                    }}>
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
