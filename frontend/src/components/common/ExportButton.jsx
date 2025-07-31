import React, { useState } from 'react';
import { Button, Dropdown, Menu, message, Modal } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';

const ExportButton = ({
  data = [],
  columns = [],
  filename = 'export',
  title = 'Export Data',
  customPDFConfig = null,
  disabled = false,
  loading = false,
  size = 'default',
  type = 'default',
  showFormats = ['csv', 'excel', 'pdf'],
  onExportStart = null,
  onExportComplete = null,
  onExportError = null
}) => {
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);

  const handleExport = async (format) => {
    if (!data || data.length === 0) {
      message.warning(t('export.no_data_to_export'));
      return;
    }

    try {
      setExporting(true);
      setExportFormat(format);
      
      if (onExportStart) {
        onExportStart(format);
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const finalFilename = `${filename}_${timestamp}`;

      switch (format) {
        case 'csv':
          await exportToCSV(data, columns, finalFilename);
          break;
        case 'excel':
          await exportToExcel(data, columns, finalFilename, title);
          break;
        case 'pdf':
          await exportToPDF(data, columns, finalFilename, title, customPDFConfig);
          break;
        default:
          throw new Error('Unsupported export format');
      }

      message.success(t('export.export_success', { format: format.toUpperCase() }));
      
      if (onExportComplete) {
        onExportComplete(format, finalFilename);
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error(t('export.export_failed', { format: format.toUpperCase() }));
      
      if (onExportError) {
        onExportError(error, format);
      }
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

  const menu = (
    <Menu
      onClick={({ key }) => handleExport(key)}
      items={[
        showFormats.includes('csv') && {
          key: 'csv',
          icon: <FileTextOutlined style={{ color: getFormatColor('csv') }} />,
          label: (
            <span>
              {t('export.export_csv')}
              <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                ({t('export.csv_description')})
              </span>
            </span>
          ),
          disabled: exporting
        },
        showFormats.includes('excel') && {
          key: 'excel',
          icon: <FileExcelOutlined style={{ color: getFormatColor('excel') }} />,
          label: (
            <span>
              {t('export.export_excel')}
              <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                ({t('export.excel_description')})
              </span>
            </span>
          ),
          disabled: exporting
        },
        showFormats.includes('pdf') && {
          key: 'pdf',
          icon: <FilePdfOutlined style={{ color: getFormatColor('pdf') }} />,
          label: (
            <span>
              {t('export.export_pdf')}
              <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                ({t('export.pdf_description')})
              </span>
            </span>
          ),
          disabled: exporting
        }
      ].filter(Boolean)}
    />
  );

  // If only one format is available, show direct button
  if (showFormats.length === 1) {
    const format = showFormats[0];
    return (
      <Button
        type={type}
        size={size}
        icon={exporting && exportFormat === format ? undefined : getFormatIcon(format)}
        loading={exporting && exportFormat === format}
        disabled={disabled || loading}
        onClick={() => handleExport(format)}
      >
        {exporting && exportFormat === format
          ? t('export.exporting')
          : t(`export.export_${format}`)}
      </Button>
    );
  }

  // Multiple formats - show dropdown
  return (
    <Dropdown 
      overlay={menu} 
      trigger={['click']}
      disabled={disabled || loading || exporting}
      placement="bottomRight"
    >
      <Button
        type={type}
        size={size}
        icon={exporting ? undefined : <DownloadOutlined />}
        loading={exporting}
        disabled={disabled || loading}
      >
        {exporting ? t('export.exporting') : t('export.export')}
      </Button>
    </Dropdown>
  );
};

export default ExportButton;
