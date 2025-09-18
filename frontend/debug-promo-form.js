// Debug script to test promo code form validation
// Run this in the browser console when the promo code form is open

console.log('🔍 Debugging Promo Code Form Validation');

// Function to get current form values
function getFormValues() {
  const form = document.querySelector('.ant-form');
  if (!form) {
    console.log('❌ Form not found');
    return;
  }
  
  const inputs = form.querySelectorAll('input, select, textarea');
  const values = {};
  
  inputs.forEach(input => {
    if (input.name) {
      values[input.name] = input.value;
    }
  });
  
  console.log('📋 Current form values:', values);
  return values;
}

// Function to check required fields
function checkRequiredFields() {
  console.log('\n🔍 Checking required fields...');
  
  const requiredFields = [
    { name: 'code', label: 'Code' },
    { name: 'discount_type', label: 'Discount Type' },
    { name: 'discount_value', label: 'Discount Value' },
    { name: 'valid_from', label: 'Valid From' },
    { name: 'valid_until', label: 'Valid Until' }
  ];
  
  let hasErrors = false;
  
  requiredFields.forEach(field => {
    const input = document.querySelector(`[name="${field.name}"]`);
    if (!input) {
      console.log(`❌ Field not found: ${field.label} (${field.name})`);
      hasErrors = true;
      return;
    }
    
    const value = input.value?.trim();
    const isEmpty = !value || value === '';
    
    console.log(`${isEmpty ? '❌' : '✅'} ${field.label}: "${value || 'EMPTY'}"`);
    
    if (isEmpty) {
      hasErrors = true;
    }
  });
  
  return !hasErrors;
}

// Function to simulate form submission
function testFormSubmission() {
  console.log('\n🚀 Testing form submission...');
  
  const submitButton = document.querySelector('button[type="submit"], .ant-btn-primary');
  if (!submitButton) {
    console.log('❌ Submit button not found');
    return;
  }
  
  console.log('✅ Submit button found:', submitButton.textContent);
  
  // Check if form validates before submission
  const isValid = checkRequiredFields();
  console.log(`📊 Form validation result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  
  if (!isValid) {
    console.log('\n💡 Suggested fixes:');
    console.log('1. Fill in all required fields');
    console.log('2. Check if date pickers have valid dates');
    console.log('3. Ensure discount type is selected');
    console.log('4. Verify discount value is a positive number');
  }
}

// Function to auto-fill form with test data
function fillTestData() {
  console.log('\n🔧 Filling form with test data...');
  
  // Fill code field
  const codeInput = document.querySelector('[name="code"]');
  if (codeInput) {
    codeInput.value = 'TEST' + Date.now();
    codeInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Code field filled');
  }
  
  // Select discount type
  const discountTypeSelect = document.querySelector('[name="discount_type"]');
  if (discountTypeSelect) {
    // Try to trigger the Select component
    const selectDiv = discountTypeSelect.closest('.ant-select');
    if (selectDiv) {
      selectDiv.click();
      setTimeout(() => {
        const percentageOption = document.querySelector('.ant-select-item[title="Percentage"]');
        if (percentageOption) {
          percentageOption.click();
          console.log('✅ Discount type selected: Percentage');
        }
      }, 100);
    }
  }
  
  // Fill discount value
  setTimeout(() => {
    const discountValueInput = document.querySelector('[name="discount_value"]');
    if (discountValueInput) {
      discountValueInput.value = '10';
      discountValueInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Discount value filled: 10%');
    }
  }, 200);
  
  console.log('✅ Test data filled (dates should be auto-filled)');
  
  // Check results after a short delay
  setTimeout(() => {
    console.log('\n📊 Final form validation:');
    testFormSubmission();
  }, 500);
}

// Main debug function
function debugPromoForm() {
  console.log('🔍 Starting Promo Code Form Debug...\n');
  
  getFormValues();
  checkRequiredFields();
  testFormSubmission();
  
  console.log('\n🔧 To auto-fill test data, run: fillTestData()');
  console.log('🔍 To re-check form, run: debugPromoForm()');
}

// Make functions available globally
window.debugPromoForm = debugPromoForm;
window.fillTestData = fillTestData;
window.checkRequiredFields = checkRequiredFields;

// Auto-run debug
debugPromoForm();