import { useState, useEffect } from 'react'
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
  Divider,
  Tabs,
  Card,
  Space,
  Typography,
  Tag,
  Tooltip
} from 'antd'
import { SendOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons'
import { useLanguage } from '../../contexts/LanguageContext'
import notificationsService from '../../services/notificationsService'
import { notificationTemplates, getTemplateCategories, getTemplate } from '../../utils/notificationTemplates'

const { TextArea } = Input
const { Option } = Select
const { TabPane } = Tabs
const { Text } = Typography

const EnhancedNotificationModal = ({ open, onClose, onSuccess }) => {
  const { language } = useLanguage()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('template')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateVariables, setTemplateVariables] = useState({})
  const [customers, setCustomers] = useState([])

  const notificationTypes = [
    { value: 'general', label: language === 'ar' ? 'عام' : 'General' },
    { value: 'order', label: language === 'ar' ? 'طلب' : 'Order' },
    { value: 'promotion', label: language === 'ar' ? 'عرض ترويجي' : 'Promotion' },
    { value: 'system', label: language === 'ar' ? 'نظام' : 'System' }
  ]

  const recipientTypes = [
    { value: 'user', label: language === 'ar' ? 'مستخدم واحد' : 'Single User' },
    { value: 'users', label: language === 'ar' ? 'مستخدمون متعددون' : 'Multiple Users' },
    { value: 'broadcast', label: language === 'ar' ? 'جميع المستخدمين' : 'All Users' },
    { value: 'topic', label: language === 'ar' ? 'موضوع' : 'Topic' }
  ]

  useEffect(() => {
    if (open) {
      loadCustomers()
    }
  }, [open])

  const loadCustomers = async () => {
    try {
      const response = await notificationsService.getCustomers({ 
        limit: 1000,
        active: true 
      })
      setCustomers(response.data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const handleTemplateSelect = (templateKey) => {
    setSelectedTemplate(templateKey)
    const template = notificationTemplates[templateKey]
    
    // Extract variables from template
    const variables = {}
    const regex = /{([^}]+)}/g
    let match
    
    const allText = template.title_ar + template.title_en + template.message_ar + template.message_en
    while ((match = regex.exec(allText)) !== null) {
      variables[match[1]] = ''
    }
    
    setTemplateVariables(variables)
    
    // Fill form with template data
    form.setFieldsValue({
      type: template.type,
      title_ar: template.title_ar,
      title_en: template.title_en,
      message_ar: template.message_ar,
      message_en: template.message_en
    })
  }

  const handleVariableChange = (key, value) => {
    setTemplateVariables(prev => ({
      ...prev,
      [key]: value
    }))

    if (selectedTemplate) {
      const filledTemplate = getTemplate(selectedTemplate, {
        ...templateVariables,
        [key]: value
      })
      
      form.setFieldsValue({
        title_ar: filledTemplate.title_ar,
        title_en: filledTemplate.title_en,
        message_ar: filledTemplate.message_ar,
        message_en: filledTemplate.message_en
      })
    }
  }

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
        save_to_db: values.save_to_db !== false,
        data: values.data ? JSON.parse(values.data) : null
      }

      // Add recipient-specific data
      if (values.recipient_type === 'user') {
        notificationData.user_id = values.user_id
      } else if (values.recipient_type === 'users') {
        notificationData.recipient_ids = values.recipient_ids
      } else if (values.recipient_type === 'topic') {
        notificationData.topic = values.topic
      }

      await notificationsService.sendNotification(notificationData)
      
      message.success(language === 'ar' ? 'تم إرسال الإشعار بنجاح' : 'Notification sent successfully')
      handleCancel()
      if (onSuccess) onSuccess()
      
    } catch (error) {
      message.error(error.message || (language === 'ar' ? 'فشل في إرسال الإشعار' : 'Failed to send notification'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setSelectedTemplate(null)
    setTemplateVariables({})
    setActiveTab('template')
    onClose()
  }

  const templateCategories = getTemplateCategories()

  return (
    <Modal
      title={language === 'ar' ? 'إرسال إشعار' : 'Send Notification'}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
        <TabPane 
          tab={
            <span>
              <FileTextOutlined />
              {language === 'ar' ? 'القوالب' : 'Templates'}
            </span>
          } 
          key="template"
        >
          <div style={{ marginBottom: '24px' }}>
            <Text type="secondary">
              {language === 'ar' ? 
                'اختر قالب جاهز لإرسال الإشعار' : 
                'Choose a ready template to send notification'
              }
            </Text>
          </div>

          <Tabs tabPosition="left" size="small">
            {Object.entries(templateCategories).map(([category, templates]) => (
              <TabPane
                tab={
                  <div>
                    {notificationTypes.find(t => t.value === category)?.label}
                    <Tag 
                      size="small" 
                      style={{ marginLeft: 4, minWidth: '20px', textAlign: 'center' }}
                    >
                      {templates.length}
                    </Tag>
                  </div>
                }
                key={category}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {templates.map(({ key, title, template }) => (
                    <Card
                      key={key}
                      size="small"
                      hoverable
                      style={{ 
                        cursor: 'pointer',
                        border: selectedTemplate === key ? '2px solid #1890ff' : '1px solid #d9d9d9'
                      }}
                      onClick={() => handleTemplateSelect(key)}
                    >
                      <div>
                        <Text strong>{title}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {template.message_en.substring(0, 80)}...
                        </Text>
                      </div>
                    </Card>
                  ))}
                </Space>
              </TabPane>
            ))}
          </Tabs>

          {selectedTemplate && Object.keys(templateVariables).length > 0 && (
            <Card 
              title={language === 'ar' ? 'متغيرات القالب' : 'Template Variables'}
              style={{ marginTop: '16px' }}
              size="small"
            >
              <Row gutter={[16, 16]}>
                {Object.keys(templateVariables).map(key => (
                  <Col xs={24} sm={12} key={key}>
                    <div>
                      <Text strong>{key}:</Text>
                      <Input
                        size="small"
                        value={templateVariables[key]}
                        onChange={(e) => handleVariableChange(key, e.target.value)}
                        placeholder={`Enter ${key}`}
                        style={{ marginTop: '4px' }}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {selectedTemplate && (
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Button 
                type="primary" 
                onClick={() => setActiveTab('form')}
                icon={<EditOutlined />}
              >
                {language === 'ar' ? 'تخصيص وإرسال' : 'Customize & Send'}
              </Button>
            </div>
          )}
        </TabPane>

        <TabPane 
          tab={
            <span>
              <EditOutlined />
              {language === 'ar' ? 'نموذج الإرسال' : 'Send Form'}
            </span>
          } 
          key="form"
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
                  rules={[{ required: true }]}
                >
                  <Select options={recipientTypes} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label={language === 'ar' ? 'نوع الإشعار' : 'Notification Type'}
                  rules={[{ required: true }]}
                >
                  <Select options={notificationTypes} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item dependencies={['recipient_type']}>
              {({ getFieldValue }) => {
                const recipientType = getFieldValue('recipient_type')
                
                if (recipientType === 'user') {
                  return (
                    <Form.Item
                      name="user_id"
                      label={language === 'ar' ? 'المستخدم' : 'User'}
                      rules={[{ required: true }]}
                    >
                      <Select
                        showSearch
                        placeholder={language === 'ar' ? 'اختر مستخدم' : 'Select user'}
                        filterOption={(input, option) =>
                          option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {customers.map(customer => (
                          <Option key={customer.id} value={customer.id}>
                            {customer.first_name} {customer.last_name} ({customer.email})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )
                }
                
                if (recipientType === 'users') {
                  return (
                    <Form.Item
                      name="recipient_ids"
                      label={language === 'ar' ? 'المستخدمون' : 'Users'}
                      rules={[{ required: true }]}
                    >
                      <Select
                        mode="multiple"
                        showSearch
                        placeholder={language === 'ar' ? 'اختر مستخدمين' : 'Select users'}
                        filterOption={(input, option) =>
                          option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {customers.map(customer => (
                          <Option key={customer.id} value={customer.id}>
                            {customer.first_name} {customer.last_name} ({customer.email})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )
                }
                
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

            <Form.Item
              name="data"
              label={language === 'ar' ? 'بيانات إضافية (JSON)' : 'Additional Data (JSON)'}
            >
              <TextArea 
                rows={2}
                placeholder={language === 'ar' ? '{"key": "value"}' : '{"key": "value"}'}
              />
            </Form.Item>

            <Form.Item name="save_to_db" valuePropName="checked">
              <Switch 
                checkedChildren={language === 'ar' ? 'حفظ في قاعدة البيانات' : 'Save to Database'}
                unCheckedChildren={language === 'ar' ? 'عدم الحفظ' : 'Don\'t Save'}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={handleCancel}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  icon={<SendOutlined />}
                >
                  {language === 'ar' ? 'إرسال الإشعار' : 'Send Notification'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
    </Modal>
  )
}

export default EnhancedNotificationModal
