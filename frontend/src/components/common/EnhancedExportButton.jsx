import React, { useState } from 'react';
import { Button, Dropdown, Menu, message, Modal, DatePicker, Select, Space, Row, Col, Form } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined, SettingOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';

const { Option } = Select;
const { RangePicker } = DatePicker;

const EnhancedExportButton = ({
  onDataFetch, // Async function to fetch data: (filters) => Promise<data[]>
  columns = [],
  baseFilename = 'export',
  title = 'Export Data',
  currentFilters = {},
  totalCount = 0,
  customPDFConfig = null,
  disabled = false,
  size = 'default',
  type = 'default',
  showFormats = ['csv', 'excel', 'pdf']
}) => {
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleDirectExport = async (format) => {
    if (!onDataFetch) {
      message.error('Export data source not configured');
      return;
    }

    try {
      setExporting(true);
      setExportFormat(format);
      
      message.loading(`Fetching data for ${format.toUpperCase()} export...`, 0);
      
      // Fetch all data using current filters
      const data = await onDataFetch(currentFilters);
      message.destroy();
      
      if (!data || data.length === 0) {
        message.warning('No data found matching current filters');
        return;
      }

      // Generate filename with filter info
      const filterSuffix = [];
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          filterSuffix.push(`${key}-${value}`);
        }
      });
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${baseFilename}${filterSuffix.length > 0 ? '-' + filterSuffix.join('-') : ''}_${timestamp}`;
      const exportTitle = `${title} - ${data.length} records`;

      switch (format) {
        case 'csv':
          await exportToCSV(data, columns, filename);
          break;
        case 'excel':
          await exportToExcel(data, columns, filename, exportTitle);
          break;
        case 'pdf':
          await exportToPDF(data, columns, filename, exportTitle, customPDFConfig);
          break;
        default:
          throw new Error('Unsupported export format');
      }

      message.success(`${format.toUpperCase()} export completed successfully! (${data.length} records)`);
    } catch (error) {
      message.destroy();
      console.error('Export error:', error);
      message.error(`Failed to export ${format.toUpperCase()} file: ${error.message}`);
    } finally {
      setExporting(false);
      setExportFormat(null);
    }
  };

  const handleCustomExport = async (values) => {
    const { format, dateRange, additionalFilters } = values;
    
    // Combine current filters with custom filters
    const customFilters = {
      ...currentFilters,
      ...additionalFilters,
      ...(dateRange && {
        date_from: dateRange[0]?.format('YYYY-MM-DD'),
        date_to: dateRange[1]?.format('YYYY-MM-DD')
      })
    };

    try {
      setExporting(true);
      setExportFormat(format);
      setModalVisible(false);
      
      message.loading(`Preparing custom ${format.toUpperCase()} export...`, 0);
      
      const data = await onDataFetch(customFilters);
      message.destroy();
      
      if (!data || data.length === 0) {
        message.warning('No data found matching the specified criteria');
        return;
      }

      // Generate filename with custom filter info
      const filterSuffix = [];
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          filterSuffix.push(`${key}-${value}`);
        }
      });
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${baseFilename}-custom${filterSuffix.length > 0 ? '-' + filterSuffix.join('-') : ''}_${timestamp}`;
      const exportTitle = `${title} - Custom Export - ${data.length} records`;

      switch (format) {
        case 'csv':
          await exportToCSV(data, columns, filename);
          break;
        case 'excel':
          await exportToExcel(data, columns, filename, exportTitle);
          break;
        case 'pdf':
          await exportToPDF(data, columns, filename, exportTitle, customPDFConfig);
          break;
        default:
          throw new Error('Unsupported export format');
      }

      message.success(`Custom ${format.toUpperCase()} export completed! (${data.length} records)`);
      form.resetFields();
    } catch (error) {
      message.destroy();
      console.error('Custom export error:', error);
      message.error(`Custom export failed: ${error.message}`);
    } finally {
      setExporting(false);
      setExportFormat(null);
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'csv':
        return <FileTextOutlined />;
      case 'excel':
        return <FileExcelOutlined />;
      case 'pdf':
        return <FilePdfOutlined />;
      default:
        return <DownloadOutlined />;
    }
  };

  const getFormatColor = (format) => {
    switch (format) {
      case 'csv':
        return '#52c41a';
      case 'excel':
        return '#1890ff';
      case 'pdf':
        return '#f5222d';
      default:
        return undefined;
    }
  };

  const exportMenu = (
    <Menu>
      {showFormats.map((format) => (
        <Menu.Item
          key={format}
          icon={getFormatIcon(format)}
          onClick={() => handleDirectExport(format)}
          style={{ color: getFormatColor(format) }}
        >
          Export as {format.toUpperCase()}
          {totalCount > 0 && ` (${totalCount} records)`}
        </Menu.Item>
      ))}
      <Menu.Divider />
      <Menu.Item
        key="custom"
        icon={<SettingOutlined />}
        onClick={() => setModalVisible(true)}
      >
        Custom Export Options
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown 
        overlay={exportMenu} 
        trigger={['click']} 
        disabled={disabled || exporting}
        placement="bottomRight"
      >
        <Button
          icon={<DownloadOutlined />}
          loading={exporting}
          disabled={disabled}
          size={size}
          type={type}
        >
          Export {exporting && exportFormat && `(${exportFormat.toUpperCase()})`}
        </Button>
      </Dropdown>

      <Modal
        title="Custom Export Options"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={exporting}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCustomExport}
          initialValues={{
            format: 'excel'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="format"
                label="Export Format"
                rules={[{ required: true, message: 'Please select export format' }]}
              >
                <Select placeholder="Select format">
                  {showFormats.map((format) => (
                    <Option key={format} value={format}>
                      {getFormatIcon(format)} {format.toUpperCase()}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dateRange"
                label="Date Range (Optional)"
              >
                <RangePicker 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="Additional Filters"
            extra="These will be combined with current active filters"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['additionalFilters', 'status']} label="Status">
                    <Select placeholder="Any status" allowClear>
                      <Option value="open">Open</Option>
                      <Option value="in_progress">In Progress</Option>
                      <Option value="resolved">Resolved</Option>
                      <Option value="closed">Closed</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['additionalFilters', 'priority']} label="Priority">
                    <Select placeholder="Any priority" allowClear>
                      <Option value="low">Low</Option>
                      <Option value="medium">Medium</Option>
                      <Option value="high">High</Option>
                      <Option value="urgent">Urgent</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default EnhancedExportButton;
