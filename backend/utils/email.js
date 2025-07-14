// const nodemailer = require('nodemailer');
// const path = require('path');
// const fs = require('fs').promises;
// require('dotenv').config();

// // Create transporter
// const transporter = nodemailer.createTransporter({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: process.env.SMTP_PORT == 465,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS
//   }
// });

// /**
//  * Load email template
//  */
// const loadTemplate = async (templateName, data = {}) => {
//   try {
//     const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
//     let template = await fs.readFile(templatePath, 'utf8');
    
//     // Replace placeholders with actual data
//     Object.keys(data).forEach(key => {
//       const placeholder = new RegExp(`{{${key}}}`, 'g');
//       template = template.replace(placeholder, data[key]);
//     });
    
//     return template;
//   } catch (error) {
//     console.error('Template loading error:', error);
//     return null;
//   }
// };

// /**
//  * Send email
//  */
// const sendEmail = async ({ to, subject, template, data = {}, html, text }) => {
//   try {
//     let emailHtml = html;
    
//     if (template && !html) {
//       emailHtml = await loadTemplate(template, data);
//     }
    
//     if (!emailHtml && !text) {
//       throw new Error('Either template, html, or text content is required');
//     }
    
//     const mailOptions = {
//       from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
//       to,
//       subject,
//       html: emailHtml,
//       text
//     };
    
//     const result = await transporter.sendMail(mailOptions);
//     console.log('Email sent successfully:', result.messageId);
//     return result;
//   } catch (error) {
//     console.error('Email sending error:', error);
//     throw error;
//   }
// };

// /**
//  * Send bulk emails
//  */
// const sendBulkEmails = async (emails) => {
//   const results = [];
  
//   for (const email of emails) {
//     try {
//       const result = await sendEmail(email);
//       results.push({ success: true, messageId: result.messageId, to: email.to });
//     } catch (error) {
//       results.push({ success: false, error: error.message, to: email.to });
//     }
//   }
  
//   return results;
// };

// /**
//  * Verify transporter connection
//  */
// const verifyConnection = async () => {
//   try {
//     await transporter.verify();
//     console.log('✅ Email service connected successfully');
//     return true;
//   } catch (error) {
//     console.error('❌ Email service connection failed:', error);
//     return false;
//   }
// };

// module.exports = {
//   sendEmail,
//   sendBulkEmails,
//   verifyConnection,
//   transporter
// };
