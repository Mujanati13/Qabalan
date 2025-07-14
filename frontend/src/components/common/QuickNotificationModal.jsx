import { useState } from 'react'
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  Button, 
  message, 
  Row, 
  Col,
  Switch,
  Divider
} from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { useLanguage } from '../../contexts/LanguageContext'
import notificationsService from '../../services/notificationsService'

const { TextArea } = Input
const { Option } = Select

const QuickNotificationModal = ({ open, onClose, onSuccess }) => {
  const { language } = useLanguage()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const notificationTypes = [
    { value: 'general', label: language === 'ar' ? 'عام' : 'General' },
    { value: 'order', label: language === 'ar' ? 'طلب' : 'Order' },
    { value: 'promotion', label: language === 'ar' ? 'عرض ترويجي' : 'Promotion' },
    { value: 'system', label: language === 'ar' ? 'نظام' : 'System' }
  ]

  const recipientTypes = [
    { value: 'broadcast', label: language === 'ar' ? 'جميع المستخدمين' : 'All Users' },
    { value: 'topic', label: language === 'ar' ? 'موضوع' : 'Topic' }
  ]

  const handleSend = async (values) => {
    try {
      setLoading(true)
      
      const notificationData = {
        recipient_type: values.recipient_type || 'broadcast',
        title_ar: values.title_ar,
        title_en: values.title_en,
        message_ar: values.message_ar,
        message_en: values.message_en,
        type: values.type || 'general',
        save_to_db: values.save_to_db !== false
      }

      if (values.recipient_type === 'topic') {
        notificationData.topic = values.topic
      }

      await notificationsService.sendNotification(notificationData)
      
      message.success(language === 'ar' ? 'تم إرسال الإشعار بنجاح' : 'Notification sent successfully')
      form.resetFields()
      onClose()
      if (onSuccess) onSuccess()
      
    } catch (error) {
      message.error(error.message || (language === 'ar' ? 'فشل في إرسال الإشعار' : 'Failed to send notification'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={language === 'ar' ? 'إرسال إشعار سريع' : 'Quick Send Notification'}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSend}
        initialValues={{
          recipient_type: 'broadcast',
          type: 'general',
          save_to_db: true
        }}
      >
        <Row gutter={[16, 0]}>
          <Col span={12}>
            <Form.Item
              name="recipient_type"
              label={language === 'ar' ? 'نوع المستقبل' : 'Recipient Type'}
            >
              <Select options={recipientTypes} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="type"
              label={language === 'ar' ? 'نوع الإشعار' : 'Notification Type'}
            >
              <Select options={notificationTypes} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item dependencies={['recipient_type']}>
          {({ getFieldValue }) => {
            const recipientType = getFieldValue('recipient_type')
            
            if (recipientType === 'topic') {
              return (
                <Form.Item
                  name="topic"
                  label={language === 'ar' ? 'الموضوع' : 'Topic'}
                  rules={[{ required: true }]}
                >
                  <Input 
                    placeholder={language === 'ar' ? 'أدخل اسم الموضوع' : 'Enter topic name'}
                  />
                </Form.Item>
              )
            }
            
            return null
          }}
        </Form.Item>

        <Divider />

        <Row gutter={[16, 0]}>
          <Col span={12}>
            <Form.Item
              name="title_ar"
              label={language === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
              rules={[{ required: true }]}
            >
              <Input 
                placeholder={language === 'ar' ? 'أدخل العنوان بالعربية' : 'Enter title in Arabic'}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="title_en"
              label={language === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}
              rules={[{ required: true }]}
            >
              <Input 
                placeholder={language === 'ar' ? 'أدخل العنوان بالإنجليزية' : 'Enter title in English'}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 0]}>
          <Col span={12}>
            <Form.Item
              name="message_ar"
              label={language === 'ar' ? 'الرسالة (عربي)' : 'Message (Arabic)'}
              rules={[{ required: true }]}
            >
              <TextArea 
                rows={3}
                placeholder={language === 'ar' ? 'أدخل الرسالة بالعربية' : 'Enter message in Arabic'}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="message_en"
              label={language === 'ar' ? 'الرسالة (إنجليزي)' : 'Message (English)'}
              rules={[{ required: true }]}
            >
              <TextArea 
                rows={3}
                placeholder={language === 'ar' ? 'أدخل الرسالة بالإنجليزية' : 'Enter message in English'}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="save_to_db" valuePropName="checked">
          <Switch 
            checkedChildren={language === 'ar' ? 'حفظ في قاعدة البيانات' : 'Save to Database'}
            unCheckedChildren={language === 'ar' ? 'عدم الحفظ' : 'Don\'t Save'}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={handleCancel} style={{ marginRight: 8 }}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<SendOutlined />}
          >
            {language === 'ar' ? 'إرسال' : 'Send'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default QuickNotificationModal
