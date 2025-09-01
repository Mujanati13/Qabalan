const { sendVerificationSMS, getBalance } = require('./utils/sms');

async function testSMS() {
  try {
    console.log('🔄 Testing Qabalan SMS Gateway...');
    
    // Test get balance first
    console.log('\n📊 Checking account balance...');
    const balanceResult = await getBalance();
    console.log('Balance result:', JSON.stringify(balanceResult, null, 2));
    
    // Test SMS sending
    console.log('\n📱 Testing SMS verification...');
    const testPhone = '962771234567'; // Replace with a real test number
    const testCode = '123456';
    
    console.log(`Sending SMS to: ${testPhone} with code: ${testCode}`);
    const smsResult = await sendVerificationSMS(testPhone, testCode, 'en');
    console.log('SMS result:', JSON.stringify(smsResult, null, 2));
    
    if (smsResult.success) {
      console.log('✅ SMS sent successfully!');
    } else {
      console.log('❌ SMS failed:', smsResult.error);
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

console.log('Starting SMS test...');
testSMS().then(() => {
  console.log('Test function completed');
}).catch(err => {
  console.error('Test function error:', err);
});
