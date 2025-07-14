const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const { executeQuery } = require('../config/database');

class InvoiceService {
  /**
   * Get order details with all necessary information for invoice
   */
  async getOrderDetails(orderId) {
    try {
      // Get order with user information
      const orderQuery = `
        SELECT 
          o.*,
          a.name as address_name,
          a.building_no,
          a.floor_no,
          a.apartment_no,
          a.details as address_details
        FROM orders o
        LEFT JOIN user_addresses a ON o.delivery_address_id = a.id
        WHERE o.id = ?
      `;
      
      const [order] = await executeQuery(orderQuery, [orderId]);
      if (!order) {
        throw new Error('Order not found');
      }

      // Get order items with product details
      const itemsQuery = `
        SELECT 
          oi.*,
          oi.unit_price as price,
          p.title_en as product_name,
          p.description_en as product_description,
          p.main_image as product_image,
          c.title_en as category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE oi.order_id = ?
        ORDER BY oi.id
      `;
      
      const items = await executeQuery(itemsQuery, [orderId]);

      return {
        order,
        items
      };
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  }

  /**
   * Generate PDF invoice
   */
  async generatePDFInvoice(orderId) {
    try {
      const { order, items } = await this.getOrderDetails(orderId);
      
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Create buffer to store PDF
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        doc.on('error', reject);

        // Generate PDF content
        this.generatePDFContent(doc, order, items);
        
        // Finalize the PDF
        doc.end();
      });
    } catch (error) {
      console.error('Error generating PDF invoice:', error);
      throw error;
    }
  }

  /**
   * Generate PDF content
   */
  generatePDFContent(doc, order, items) {
    // Company branding and header
    this.generateHeader(doc);
    
    // Invoice information
    this.generateInvoiceInfo(doc, order);
    
    // Customer information
    this.generateCustomerInfo(doc, order);
    
    // Invoice table
    this.generateInvoiceTable(doc, items);
    
    // Invoice summary
    this.generateInvoiceSummary(doc, order);
    
    // Footer
    this.generateFooter(doc);
  }

  /**
   * Generate PDF header with company branding
   */
  generateHeader(doc) {
    doc
      .fillColor('#444444')
      .fontSize(20)
      .text('QABALAN E-COMMERCE', 50, 45)
      .fontSize(10)
      .text('Premium Food Delivery Service', 50, 70)
      .text('Email: info@qabalan.com', 50, 85)
      .text('Phone: +1 (555) 123-4567', 50, 100)
      .text('Website: www.qabalan.com', 50, 115);

    // Logo placeholder (you can add actual logo here)
    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .rect(450, 45, 100, 50)
      .stroke()
      .fontSize(8)
      .fillColor('#aaaaaa')
      .text('LOGO', 490, 67);

    return doc;
  }

  /**
   * Generate invoice information
   */
  generateInvoiceInfo(doc, order) {
    const invoiceNumber = `INV-${order.id.toString().padStart(6, '0')}`;
    const invoiceDate = new Date(order.created_at).toLocaleDateString();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(); // 30 days from now

    doc
      .fillColor('#444444')
      .fontSize(16)
      .text('INVOICE', 50, 160);

    doc
      .fontSize(10)
      .text(`Invoice Number: ${invoiceNumber}`, 50, 185)
      .text(`Invoice Date: ${invoiceDate}`, 50, 200)
      .text(`Due Date: ${dueDate}`, 50, 215)
      .text(`Order Status: ${(order.order_status || 'pending').toUpperCase()}`, 50, 230);

    return doc;
  }

  /**
   * Generate customer information
   */
  generateCustomerInfo(doc, order) {
    doc
      .fillColor('#444444')
      .fontSize(12)
      .text('Bill To:', 300, 185);

    const customerY = 200;
    doc
      .fontSize(10)
      .fillColor('#444444')
      .text(order.customer_name || 'N/A', 300, customerY)
      .text(order.customer_email || 'N/A', 300, customerY + 15)
      .text(order.customer_phone || 'N/A', 300, customerY + 30);

    // Delivery address
    if (order.street_address || order.address_name) {
      doc.text('Delivery Address:', 300, customerY + 50);
      
      if (order.address_name) {
        doc.text(order.address_name, 300, customerY + 65);
      }
      
      if (order.street_address) {
        doc.text(order.street_address, 300, customerY + 80);
      } else if (order.building_no || order.floor_no || order.apartment_no) {
        let addressLine = '';
        if (order.building_no) addressLine += `Building ${order.building_no}`;
        if (order.floor_no) addressLine += `, Floor ${order.floor_no}`;
        if (order.apartment_no) addressLine += `, Apt ${order.apartment_no}`;
        doc.text(addressLine, 300, customerY + 80);
      }
      
      if (order.address_details) {
        doc.text(order.address_details, 300, customerY + 95);
      }
      
      if (order.city || order.state || order.postal_code) {
        doc.text(`${order.city || ''}, ${order.state || ''} ${order.postal_code || ''}`, 300, customerY + 110);
      }
      
      if (order.country) {
        doc.text(order.country, 300, customerY + 125);
      }
    }

    return doc;
  }

  /**
   * Generate invoice table
   */
  generateInvoiceTable(doc, items) {
    let i;
    const invoiceTableTop = 330;

    // Table headers
    doc.font('Helvetica-Bold');
    this.generateTableRow(
      doc,
      invoiceTableTop,
      'Item',
      'Description',
      'Unit Price',
      'Qty',
      'Total'
    );
    this.generateHr(doc, invoiceTableTop + 20);

    doc.font('Helvetica');

    // Table rows
    let position = invoiceTableTop + 30;
    for (i = 0; i < items.length; i++) {
      const item = items[i];
      const total = (parseFloat(item.price) * parseInt(item.quantity)).toFixed(2);
      
      this.generateTableRow(
        doc,
        position,
        item.product_name || 'N/A',
        (item.product_description || '').substring(0, 30) + '...',
        `$${parseFloat(item.price).toFixed(2)}`,
        item.quantity.toString(),
        `$${total}`
      );

      position += 30;
      this.generateHr(doc, position - 10);
    }

    return doc;
  }

  /**
   * Generate invoice summary
   */
  generateInvoiceSummary(doc, order) {
    const subtotal = parseFloat(order.subtotal || 0);
    const deliveryFee = parseFloat(order.delivery_fee || 0);
    const tax = parseFloat(order.tax_amount || 0);
    const discount = parseFloat(order.discount_amount || 0);
    const total = parseFloat(order.total_amount || 0);

    const summaryTop = 500;

    doc
      .font('Helvetica')
      .fontSize(10);

    // Subtotal
    this.generateTableRow(
      doc,
      summaryTop,
      '',
      '',
      'Subtotal:',
      '',
      `$${subtotal.toFixed(2)}`
    );

    // Delivery fee
    this.generateTableRow(
      doc,
      summaryTop + 20,
      '',
      '',
      'Delivery Fee:',
      '',
      `$${deliveryFee.toFixed(2)}`
    );

    // Tax
    this.generateTableRow(
      doc,
      summaryTop + 40,
      '',
      '',
      'Tax:',
      '',
      `$${tax.toFixed(2)}`
    );

    // Discount
    if (discount > 0) {
      this.generateTableRow(
        doc,
        summaryTop + 60,
        '',
        '',
        'Discount:',
        '',
        `-$${discount.toFixed(2)}`
      );
    }

    // Total
    doc.font('Helvetica-Bold');
    this.generateTableRow(
      doc,
      summaryTop + (discount > 0 ? 80 : 60),
      '',
      '',
      'Total:',
      '',
      `$${total.toFixed(2)}`
    );

    return doc;
  }

  /**
   * Generate table row
   */
  generateTableRow(doc, y, item, description, unitCost, quantity, lineTotal) {
    doc
      .fontSize(10)
      .text(item, 50, y)
      .text(description, 150, y)
      .text(unitCost, 300, y, { width: 90, align: 'right' })
      .text(quantity, 400, y, { width: 90, align: 'right' })
      .text(lineTotal, 0, y, { align: 'right' });
  }

  /**
   * Generate horizontal line
   */
  generateHr(doc, y) {
    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
  }

  /**
   * Generate footer
   */
  generateFooter(doc) {
    doc
      .fontSize(8)
      .fillColor('#444444')
      .text(
        'Thank you for your business! For any questions about this invoice, please contact us at info@qabalan.com',
        50,
        700,
        { align: 'center', width: 500 }
      );

    doc
      .text(
        'Terms & Conditions: Payment is due within 30 days. Late payments may incur additional charges.',
        50,
        720,
        { align: 'center', width: 500 }
      );
  }

  /**
   * Generate Excel export for orders
   */
  async generateExcelExport(filters = {}) {
    try {
      // Build query based on filters
      let query = `
        SELECT 
          o.id as order_id,
          o.order_number,
          o.created_at as order_date,
          o.order_status as status,
          o.payment_status,
          o.subtotal,
          o.delivery_fee,
          o.tax_amount,
          o.discount_amount,
          o.total_amount,
          o.customer_name,
          o.customer_email,
          o.customer_phone,
          COALESCE(
            CONCAT(a.name, 
              CASE WHEN a.building_no IS NOT NULL THEN CONCAT(', Building: ', a.building_no) ELSE '' END, 
              CASE WHEN a.floor_no IS NOT NULL THEN CONCAT(', Floor: ', a.floor_no) ELSE '' END,
              CASE WHEN a.apartment_no IS NOT NULL THEN CONCAT(', Apt: ', a.apartment_no) ELSE '' END,
              CASE WHEN a.details IS NOT NULL THEN CONCAT(', ', a.details) ELSE '' END
            ), 
            'No address'
          ) as delivery_address
        FROM orders o
        LEFT JOIN user_addresses a ON o.delivery_address_id = a.id
        WHERE 1=1
      `;

      const params = [];

      // Apply filters
      if (filters.startDate) {
        query += ' AND o.created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND o.created_at <= ?';
        params.push(filters.endDate);
      }

      if (filters.status) {
        query += ' AND o.order_status = ?';
        params.push(filters.status);
      }

      if (filters.userId) {
        query += ' AND o.user_id = ?';
        params.push(filters.userId);
      }

      query += ' ORDER BY o.created_at DESC';

      const orders = await executeQuery(query, params);

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Orders');

      // Add headers
      worksheet.columns = [
        { header: 'Order ID', key: 'order_id', width: 10 },
        { header: 'Order Number', key: 'order_number', width: 15 },
        { header: 'Date', key: 'order_date', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Payment Status', key: 'payment_status', width: 15 },
        { header: 'Customer Name', key: 'customer_name', width: 20 },
        { header: 'Customer Email', key: 'customer_email', width: 25 },
        { header: 'Customer Phone', key: 'customer_phone', width: 15 },
        { header: 'Delivery Address', key: 'delivery_address', width: 40 },
        { header: 'Subtotal', key: 'subtotal', width: 12 },
        { header: 'Delivery Fee', key: 'delivery_fee', width: 12 },
        { header: 'Tax', key: 'tax_amount', width: 12 },
        { header: 'Discount', key: 'discount_amount', width: 12 },
        { header: 'Total', key: 'total_amount', width: 12 }
      ];

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };

      // Add data
      orders.forEach(order => {
        worksheet.addRow({
          order_id: order.order_id,
          order_number: order.order_number,
          order_date: new Date(order.order_date).toLocaleDateString(),
          status: order.status,
          payment_status: order.payment_status,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          delivery_address: order.delivery_address,
          subtotal: parseFloat(order.subtotal || 0),
          delivery_fee: parseFloat(order.delivery_fee || 0),
          tax_amount: parseFloat(order.tax_amount || 0),
          discount_amount: parseFloat(order.discount_amount || 0),
          total_amount: parseFloat(order.total_amount || 0)
        });
      });

      // Add totals row
      const totalRow = worksheet.addRow({
        order_id: '',
        order_number: '',
        order_date: '',
        status: '',
        payment_status: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        delivery_address: 'TOTALS:',
        subtotal: { formula: `SUM(J2:J${worksheet.rowCount})` },
        delivery_fee: { formula: `SUM(K2:K${worksheet.rowCount})` },
        tax_amount: { formula: `SUM(L2:L${worksheet.rowCount})` },
        discount_amount: { formula: `SUM(M2:M${worksheet.rowCount})` },
        total_amount: { formula: `SUM(N2:N${worksheet.rowCount})` }
      });

      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' }
      };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;

    } catch (error) {
      console.error('Error generating Excel export:', error);
      throw error;
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStatistics(filters = {}) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_orders
        FROM orders
        WHERE 1=1
      `;

      const params = [];

      if (filters.startDate) {
        query += ' AND created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND created_at <= ?';
        params.push(filters.endDate);
      }

      const [stats] = await executeQuery(query, params);
      return stats;

    } catch (error) {
      console.error('Error fetching invoice statistics:', error);
      throw error;
    }
  }
}

module.exports = new InvoiceService();
