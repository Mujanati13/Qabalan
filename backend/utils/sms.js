const axios = require('axios');
require('dotenv').config();

// Qabalan SMS Gateway Configuration
const SMS_CONFIG = {
  accname: 'qabalanba',
  accpass: 'iC4zQ8vW1eS8gO3x',
  senderid: 'Qabalan',
  baseUrl: 'https://www.josms.net'
};

/**
 * Send SMS using Qabalan Gateway
 */
const sendSMS = async ({ to, message, type = 'general' }) => {
  try {
    console.log(`[SMS] Sending ${type} SMS to ${to}`);
    
    // Format phone number for Jordan (962 format)
    let formattedPhone = to;
    if (to.startsWith('+962')) {
      formattedPhone = to.replace('+962', '962');
    } else if (to.startsWith('00962')) {
      formattedPhone = to.replace('00962', '962');
    } else if (to.startsWith('0') && to.length === 10) {
      // Convert local Jordan number (07XXXXXXXX) to international (962XXXXXXXX)
      formattedPhone = '962' + to.substring(1);
    } else if (!to.startsWith('962')) {
      // Assume it's a local number without leading 0
      formattedPhone = '962' + to;
    }
    
    // Ensure phone number is valid Jordan format (962 + 9 digits)
    if (!/^962[0-9]{9}$/.test(formattedPhone)) {
      console.error(`[SMS] Invalid phone format: ${formattedPhone}`);
      return { success: false, error: 'Invalid phone number format' };
    }
    
    // Choose appropriate endpoint based on message type
    const endpoint = type === 'otp' 
      ? '/SMSServices/Clients/Prof/RestSingleSMS/SendSMS'
      : '/SMSServices/Clients/Prof/RestSingleSMS_General/SendSMS';
    
    // URL encode the message
    const encodedMessage = encodeURIComponent(message);
    
    // Build request URL
    const url = `${SMS_CONFIG.baseUrl}${endpoint}?` + 
      `senderid=${SMS_CONFIG.senderid}&` +
      `numbers=${formattedPhone}&` +
      `accname=${SMS_CONFIG.accname}&` +
      `AccPass=${SMS_CONFIG.accpass}&` +
      `msg=${encodedMessage}`;
    
    console.log(`[SMS] Request URL: ${SMS_CONFIG.baseUrl}${endpoint}`);
    console.log(`[SMS] Phone: ${formattedPhone}, Message length: ${message.length}`);
    
    const response = await axios.get(url, {
      timeout: 10000 // 10 seconds timeout
    });
    
    console.log(`[SMS] Response status: ${response.status}`);
    console.log(`[SMS] Response data: ${response.data}`);
    
    // Check if SMS was sent successfully
    // The Qabalan gateway typically returns success indicators in the response
    if (response.status === 200 && response.data) {
      const responseText = response.data.toString().toLowerCase();
      
      // Check for success indicators (adjust based on actual gateway responses)
      if (responseText.includes('success') || responseText.includes('sent') || 
          responseText.includes('delivered') || !responseText.includes('error')) {
        console.log('[SMS] SMS sent successfully');
        return { 
          success: true, 
          response: response.data,
          phone: formattedPhone
        };
      } else {
        console.error('[SMS] SMS failed:', response.data);
        return { 
          success: false, 
          error: response.data,
          phone: formattedPhone
        };
      }
    } else {
      console.error(`[SMS] HTTP error: ${response.status}`);
      return { 
        success: false, 
        error: `HTTP ${response.status}`,
        phone: formattedPhone
      };
    }
    
  } catch (error) {
    console.error('[SMS] Sending error:', error.message);
    return { 
      success: false, 
      error: error.message,
      phone: to
    };
  }
};

/**
 * Send verification SMS
 */
const sendVerificationSMS = async (phone, code, language = 'en') => {
  const messages = {
    en: `Your Qabalan verification code is: ${code}. Valid for 10 minutes.`,
    ar: `رمز التحقق الخاص بك في قبلان هو: ${code}. صالح لمدة 10 دقائق.`
  };
  
  return await sendSMS({
    to: phone,
    message: messages[language] || messages.en,
    type: 'otp'
  });
};

/**
 * Send order status SMS
 */
const sendOrderStatusSMS = async (phone, orderData, language = 'en') => {
  const messages = {
    en: `Order #${orderData.id} status: ${orderData.status}. Total: $${orderData.total}. Thank you for choosing Qabalan!`,
    ar: `حالة الطلب رقم ${orderData.id}: ${orderData.status}. المجموع: ${orderData.total} دولار. شكراً لاختيارك قبلان!`
  };
  
  return await sendSMS({
    to: phone,
    message: messages[language] || messages.en,
    type: 'general'
  });
};

/**
 * Get SMS account balance
 */
const getBalance = async () => {
  try {
    const url = `${SMS_CONFIG.baseUrl}/SMS/API/GetBalance?` +
      `AccName=${SMS_CONFIG.accname}&` +
      `AccPass=${SMS_CONFIG.accpass}`;
    
    const response = await axios.get(url);
    console.log('[SMS] Balance response:', response.data);
    
    return {
      success: true,
      balance: response.data
    };
  } catch (error) {
    console.error('[SMS] Balance check error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendSMS,
  sendVerificationSMS,
  sendOrderStatusSMS,
  getBalance
};
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
