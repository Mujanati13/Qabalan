// Debug script to check promo code submission data
// Add this to the handleSubmit function in PromoCodes.jsx to debug

const debugPromoSubmission = (values) => {
  console.log('🔍 DEBUGGING PROMO CODE SUBMISSION');
  console.log('===============================');
  
  console.log('📋 Raw form values:', values);
  
  // Check each required field individually
  const requiredFields = {
    code: values.code,
    discount_type: values.discount_type,
    discount_value: values.discount_value,
    valid_from: values.valid_from,
    valid_until: values.valid_until
  };
  
  console.log('📊 Required fields check:');
  Object.entries(requiredFields).forEach(([key, value]) => {
    const isEmpty = value === undefined || value === null || value === '';
    const isDayjs = value && typeof value === 'object' && value._isAMomentObject;
    const type = typeof value;
    
    console.log(`  ${isEmpty ? '❌' : '✅'} ${key}: ${JSON.stringify(value)} (${type}${isDayjs ? ', dayjs object' : ''})`);
  });
  
  // Show formatted dates
  if (values.valid_from && values.valid_until) {
    console.log('📅 Formatted dates:');
    console.log(`  valid_from: ${values.valid_from.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`  valid_until: ${values.valid_until.format('YYYY-MM-DD HH:mm:ss')}`);
  }
  
  // Show what will be sent to the server
  const formData = {
    ...values,
    valid_from: values.valid_from?.format('YYYY-MM-DD HH:mm:ss'),
    valid_until: values.valid_until?.format('YYYY-MM-DD HH:mm:ss'),
    discount_value: parseFloat(values.discount_value) || 0,
    min_order_amount: values.min_order_amount ? parseFloat(values.min_order_amount) : null,
    max_discount_amount: values.max_discount_amount ? parseFloat(values.max_discount_amount) : null,
    usage_limit: values.usage_limit ? parseInt(values.usage_limit) : null,
    user_usage_limit: values.user_usage_limit ? parseInt(values.user_usage_limit) : 1,
    is_active: values.is_active ? 1 : 0
  };
  
  console.log('📤 Data that will be sent to server:', formData);
  
  // Check for potential issues
  const issues = [];
  
  if (!formData.code) issues.push('Missing code');
  if (!formData.discount_type) issues.push('Missing discount_type');
  if (formData.discount_type !== 'free_shipping' && (!formData.discount_value || formData.discount_value <= 0)) {
    issues.push('Missing or invalid discount_value');
  }
  if (!formData.valid_from) issues.push('Missing valid_from');
  if (!formData.valid_until) issues.push('Missing valid_until');
  
  if (issues.length > 0) {
    console.log('⚠️ POTENTIAL ISSUES FOUND:');
    issues.forEach(issue => console.log(`  ❌ ${issue}`));
  } else {
    console.log('✅ All required fields look good!');
  }
  
  return formData;
};

// Usage: Add this line at the beginning of handleSubmit in PromoCodes.jsx:
// const debuggedFormData = debugPromoSubmission(values);

module.exports = debugPromoSubmission;