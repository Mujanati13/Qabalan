// Additional troubleshooting steps for Promo Code form

// Step 1: Check if form validation is working properly
// Open browser console and paste this code when the promo form is open:

function validatePromoForm() {
  console.log('🔍 Promo Form Validation Check');
  
  // Get form instance
  const form = document.querySelector('.ant-form');
  console.log('Form found:', !!form);
  
  // Check required fields
  const requiredSelectors = [
    '[name="code"]',
    '[name="discount_type"]', 
    '[name="valid_from"]',
    '[name="valid_until"]'
  ];
  
  requiredSelectors.forEach(selector => {
    const field = document.querySelector(selector);
    const value = field?.value || field?.textContent || 'EMPTY';
    console.log(`${selector}: ${value}`);
  });
  
  // Check discount_value specifically
  const discountValueField = document.querySelector('[name="discount_value"]');
  console.log('Discount value field exists:', !!discountValueField);
  console.log('Discount value:', discountValueField?.value || 'EMPTY');
  
  // Check for validation errors
  const errorMessages = document.querySelectorAll('.ant-form-item-explain-error');
  console.log('Validation errors found:', errorMessages.length);
  errorMessages.forEach((error, index) => {
    console.log(`Error ${index + 1}:`, error.textContent);
  });
}

// Step 2: Auto-fill form with valid test data
function fillValidPromoData() {
  console.log('🔧 Auto-filling promo form with valid data...');
  
  // Fill code
  const codeInput = document.querySelector('[name="code"]');
  if (codeInput) {
    codeInput.value = 'TEST' + Math.random().toString(36).substr(2, 5).toUpperCase();
    codeInput.dispatchEvent(new Event('input', { bubbles: true }));
    codeInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  // Select discount type (trigger dropdown)
  setTimeout(() => {
    const discountTypeSelect = document.querySelector('.ant-select-selector');
    if (discountTypeSelect) {
      discountTypeSelect.click();
      
      setTimeout(() => {
        const percentageOption = Array.from(document.querySelectorAll('.ant-select-item-option'))
          .find(option => option.textContent.includes('Percentage'));
        if (percentageOption) {
          percentageOption.click();
          console.log('✅ Selected percentage discount type');
          
          // Fill discount value after selecting type
          setTimeout(() => {
            const discountValueInput = document.querySelector('[name="discount_value"]');
            if (discountValueInput) {
              // Clear and set value
              discountValueInput.focus();
              discountValueInput.select();
              document.execCommand('insertText', false, '15');
              discountValueInput.dispatchEvent(new Event('input', { bubbles: true }));
              discountValueInput.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('✅ Set discount value to 15%');
            }
          }, 200);
        }
      }, 100);
    }
  }, 100);
  
  console.log('✅ Form auto-fill completed');
  
  // Validate after filling
  setTimeout(() => {
    validatePromoForm();
  }, 1000);
}

// Make functions available globally
window.validatePromoForm = validatePromoForm;
window.fillValidPromoData = fillValidPromoData;

console.log('🔧 Promo troubleshooting loaded');
console.log('Run validatePromoForm() to check current form state');
console.log('Run fillValidPromoData() to auto-fill with test data');