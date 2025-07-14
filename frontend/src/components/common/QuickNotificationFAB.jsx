import { useState } from 'react'
import { FloatButton, Tooltip } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { useLanguage } from '../../contexts/LanguageContext'
import QuickNotificationModal from './QuickNotificationModal'

const QuickNotificationFAB = ({ style = {} }) => {
  const { language } = useLanguage()
  const [modalOpen, setModalOpen] = useState(false)

  const defaultStyle = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 1000
  }

  return (
    <>
      <div style={{ ...defaultStyle, ...style }}>
        <Tooltip 
          title={language === 'ar' ? 'إرسال إشعار سريع' : 'Quick Send Notification'}
          placement="left"
        >
          <FloatButton
            icon={<SendOutlined />}
            type="primary"
            onClick={() => setModalOpen(true)}
            style={{ 
              backgroundColor: '#52c41a',
              borderColor: '#52c41a'
            }}
          />
        </Tooltip>
      </div>

      <QuickNotificationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          // Could trigger a refresh of notification-related data
        }}
      />
    </>
  )
}

export default QuickNotificationFAB
