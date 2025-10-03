const { executeQuery, pool } = require('../config/database');

const orderId = process.argv[2];

if (!orderId) {
  console.error('Usage: node scripts/inspect-order.js <orderId>');
  process.exit(1);
}

(async () => {
  try {
    const [order] = await executeQuery('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
    console.log('Order:', order);

    const items = await executeQuery('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    console.log('Order items:', items);
  } catch (error) {
    console.error('Failed to inspect order:', error.message);
  } finally {
    await pool.end();
  }
})();
