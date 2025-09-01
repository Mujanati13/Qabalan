// Database inspection script
const { executeQuery } = require('./config/database');

async function inspectDatabase() {
  console.log('🔍 Database Inspection');
  console.log('=====================');
  
  try {
    // Check if orders table exists
    const tables = await executeQuery("SHOW TABLES LIKE 'orders'");
    console.log('Orders table exists:', tables.length > 0 ? '✅ Yes' : '❌ No');
    
    if (tables.length > 0) {
      // Show table structure
      console.log('\n📋 Orders table structure:');
      const columns = await executeQuery('DESCRIBE orders');
      columns.forEach(col => {
        console.log(`   ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? col.Key : ''}`);
      });
      
      // Count existing orders
      const count = await executeQuery('SELECT COUNT(*) as count FROM orders');
      console.log(`\n📊 Existing orders: ${count[0].count}`);
      
      // Show sample orders
      if (count[0].count > 0) {
        const samples = await executeQuery('SELECT * FROM orders LIMIT 3');
        console.log('\n📄 Sample orders:');
        samples.forEach(order => {
          console.log(`   ID: ${order.id}, Amount: ${order.total_amount}, Status: ${order.status || 'N/A'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Database inspection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database connection refused. Check:');
      console.log('   - MySQL is running');
      console.log('   - Correct host/port in .env');
      console.log('   - Database credentials');
    }
  }
}

inspectDatabase();
