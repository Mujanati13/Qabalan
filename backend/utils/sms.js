// const twilio = require('twilio');
// require('dotenv').config();

// // Initialize Twilio client
// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// /**
//  * Send SMS
//  */
// const sendSMS = async ({ to, message }) => {
//   try {
//     if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
//       console.log('SMS service not configured');
//       return { success: false, error: 'SMS service not configured' };
//     }
    
//     const result = await client.messages.create({
//       body: message,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: to
//     });
    
//     console.log('SMS sent successfully:', result.sid);
//     return { success: true, sid: result.sid };
//   } catch (error) {
//     console.error('SMS sending error:', error);
//     return { success: false, error: error.message };
//   }
// };

// /**
//  * Send verification SMS
//  */
// const sendVerificationSMS = async (phone, code, language = 'en') => {
//   const messages = {
//     en: `Your Qabalan verification code is: ${code}. Valid for 10 minutes.`,
//     ar: `رمز التحقق الخاص بك في قبلان هو: ${code}. صالح لمدة 10 دقائق.`
//   };
  
//   return await sendSMS({
//     to: phone,
//     message: messages[language] || messages.en
//   });
// };

// /**
//  * Send order status SMS
//  */
// const sendOrderStatusSMS = async (phone, orderNumber, status, language = 'en') => {
//   const statusMessages = {
//     en: {
//       confirmed: `Your order #${orderNumber} has been confirmed and is being prepared.`,
//       preparing: `Your order #${orderNumber} is being prepared.`,
//       ready: `Your order #${orderNumber} is ready for pickup/delivery.`,
//       out_for_delivery: `Your order #${orderNumber} is out for delivery.`,
//       delivered: `Your order #${orderNumber} has been delivered. Thank you!`,
//       cancelled: `Your order #${orderNumber} has been cancelled.`
//     },
//     ar: {
//       confirmed: `تم تأكيد طلبك رقم #${orderNumber} وجاري تحضيره.`,
//       preparing: `جاري تحضير طلبك رقم #${orderNumber}.`,
//       ready: `طلبك رقم #${orderNumber} جاهز للاستلام/التوصيل.`,
//       out_for_delivery: `طلبك رقم #${orderNumber} في طريقه للتوصيل.`,
//       delivered: `تم توصيل طلبك رقم #${orderNumber}. شكراً لك!`,
//       cancelled: `تم إلغاء طلبك رقم #${orderNumber}.`
//     }
//   };
  
//   const message = statusMessages[language]?.[status] || statusMessages.en[status];
  
//   if (!message) {
//     throw new Error('Invalid order status for SMS');
//   }
  
//   return await sendSMS({ to: phone, message });
// };

// /**
//  * Send bulk SMS
//  */
// const sendBulkSMS = async (messages) => {
//   const results = [];
  
//   for (const sms of messages) {
//     try {
//       const result = await sendSMS(sms);
//       results.push({ ...result, to: sms.to });
//     } catch (error) {
//       results.push({ success: false, error: error.message, to: sms.to });
//     }
//   }
  
//   return results;
// };

// module.exports = {
//   sendSMS,
//   sendVerificationSMS,
//   sendOrderStatusSMS,
//   sendBulkSMS
// };
