const { executeQuery, pool } = require('../config/database');

(async () => {
  try {
    const columns = await executeQuery("SHOW COLUMNS FROM orders LIKE 'currency'");
    console.log(columns);
  } catch (error) {
    console.error('Error checking orders.currency column:', error.message);
  } finally {
    await pool.end();
  }
})();
