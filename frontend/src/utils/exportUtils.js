import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Converts data to CSV format and triggers download
 */
export const exportToCSV = async (data, columns, filename = 'export') => {
  try {
    // Prepare headers
    const headers = columns.map(col => col.title || col.dataIndex || col.key);
    
    // Prepare rows
    const rows = data.map(item => 
      columns.map(col => {
        const value = getValueFromColumn(item, col);
        // Clean value for CSV (remove commas, quotes, newlines)
        return typeof value === 'string' 
          ? value.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '') 
          : value;
      })
    );

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => 
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
            ? `"${cell}"`
            : cell
        ).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `${filename}.csv`);
  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error('Failed to export CSV file');
  }
};

/**
 * Converts data to Excel format and triggers download
 */
export const exportToExcel = async (data, columns, filename = 'export', sheetName = 'Data') => {
  try {
    // Prepare headers
    const headers = columns.map(col => col.title || col.dataIndex || col.key);
    
    // Prepare rows
    const rows = data.map(item => 
      columns.map(col => getValueFromColumn(item, col))
    );

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-width columns
    const colWidths = headers.map((header, index) => {
      const maxLength = Math.max(
        header.length,
        ...rows.map(row => String(row[index] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Cap at 50 characters
    });
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Write and download file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadFile(blob, `${filename}.xlsx`);
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to export Excel file');
  }
};

/**
 * Converts data to PDF format and triggers download
 */
export const exportToPDF = async (data, columns, filename = 'export', title = 'Data Export', customConfig = null) => {
  try {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    
    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(title, 40, 40);
    
    // Add timestamp
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60);

    // Prepare table data
    const headers = columns.map(col => col.title || col.dataIndex || col.key);
    const rows = data.map(item => 
      columns.map(col => {
        const value = getValueFromColumn(item, col);
        return typeof value === 'string' ? value.substring(0, 100) : String(value || ''); // Limit cell content
      })
    );

    // Default table config
    const tableConfig = {
      head: [headers],
      body: rows,
      startY: 80,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {},
      margin: { top: 80, right: 40, bottom: 40, left: 40 },
      ...customConfig
    };

    // Auto-size columns based on content
    if (!customConfig?.columnStyles) {
      const pageWidth = doc.internal.pageSize.getWidth() - tableConfig.margin.left - tableConfig.margin.right;
      const colWidth = pageWidth / headers.length;
      
      headers.forEach((_, index) => {
        tableConfig.columnStyles[index] = { cellWidth: colWidth };
      });
    }

    // Add table
    doc.autoTable(tableConfig);

    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() - 100,
        doc.internal.pageSize.getHeight() - 20
      );
    }

    // Save file
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Failed to export PDF file');
  }
};

/**
 * Helper function to extract value from data item based on column configuration
 */
const getValueFromColumn = (item, column) => {
  if (column.render && typeof column.render === 'function') {
    // If column has custom render function, use it but extract text content
    try {
      const rendered = column.render(item[column.dataIndex], item);
      if (React.isValidElement(rendered)) {
        // Extract text from React elements
        return extractTextFromReactElement(rendered);
      }
      return rendered;
    } catch (error) {
      // Fallback to raw value if render fails
      return getNestedValue(item, column.dataIndex) || '';
    }
  }
  
  return getNestedValue(item, column.dataIndex || column.key) || '';
};

/**
 * Helper function to get nested object values using dot notation
 */
const getNestedValue = (obj, path) => {
  if (!path) return '';
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Helper function to extract text content from React elements
 */
const extractTextFromReactElement = (element) => {
  if (typeof element === 'string' || typeof element === 'number') {
    return element;
  }
  
  if (React.isValidElement(element)) {
    if (element.props.children) {
      if (Array.isArray(element.props.children)) {
        return element.props.children.map(extractTextFromReactElement).join(' ');
      }
      return extractTextFromReactElement(element.props.children);
    }
    
    // Handle common Ant Design components
    if (element.type && element.type.displayName) {
      switch (element.type.displayName) {
        case 'Tag':
          return element.props.children || '';
        case 'Button':
          return element.props.children || '';
        default:
          return element.props.children || '';
      }
    }
    
    // Handle other props that might contain text
    return element.props.title || element.props.value || element.props.text || '';
  }
  
  return '';
};

/**
 * Helper function to trigger file download
 */
const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Utility function to format currency values for export
 */
import { DEFAULT_CURRENCY } from './formatters';

export const formatCurrencyForExport = (value, currency = DEFAULT_CURRENCY) => {
  if (typeof value !== 'number') return value;
  return new Intl.NumberFormat('en-JO', {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'narrowSymbol'
  }).format(value);
};

/**
 * Utility function to format date values for export
 */
export const formatDateForExport = (value, format = 'default') => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  
  switch (format) {
    case 'date':
      return date.toLocaleDateString();
    case 'time':
      return date.toLocaleTimeString();
    case 'iso':
      return date.toISOString();
    default:
      return date.toLocaleString();
  }
};

/**
 * Utility function to prepare column configuration for export
 */
export const prepareExportColumns = (tableColumns, options = {}) => {
  const { 
    excludeColumns = ['actions'], 
    includeHidden = false,
    customTitles = {},
    formatters = {}
  } = options;

  return tableColumns
    .filter(col => {
      // Exclude specified columns
      if (excludeColumns.includes(col.key || col.dataIndex)) return false;
      
      // Exclude hidden columns unless specified
      if (!includeHidden && col.hidden) return false;
      
      return true;
    })
    .map(col => ({
      ...col,
      title: customTitles[col.key] || customTitles[col.dataIndex] || col.title,
      render: formatters[col.key] || formatters[col.dataIndex] || col.render
    }));
};
