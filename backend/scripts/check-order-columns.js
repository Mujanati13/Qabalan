const mysql = require('mysql2/promise');

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'simo1234',
      database: process.env.DB_NAME || 'fecs_db'
    });

    const [deliveryOriginal] = await conn.query("SHOW COLUMNS FROM orders LIKE 'delivery_fee_original'");
    const [shippingDiscount] = await conn.query("SHOW COLUMNS FROM orders LIKE 'shipping_discount_amount'");

    console.log('delivery_fee_original column:', deliveryOriginal.length ? 'present' : 'missing');
    console.log('shipping_discount_amount column:', shippingDiscount.length ? 'present' : 'missing');
  } catch (error) {
    console.error('Error checking columns:', error.message);
    process.exitCode = 1;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
})();
