const { executeQuery } = require('../config/database');

let checked = false;
let inProgress = null;

async function ensurePaymentSchema() {
  if (checked) return true;
  if (inProgress) return inProgress;
  inProgress = (async () => {
    try {
      // Check for payment_success_indicator column
      const currencyCol = await executeQuery(`SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='orders' AND column_name='currency'`);
      let hasCurrencyColumn = currencyCol[0]?.cnt > 0;
      if (!hasCurrencyColumn) {
        console.log('[SCHEMA] Adding orders.currency column');
        await executeQuery(`ALTER TABLE orders ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'JOD' AFTER total_amount`);
        hasCurrencyColumn = true;
      }
      if (hasCurrencyColumn) {
        await executeQuery(`UPDATE orders SET currency = 'JOD' WHERE currency IS NULL OR currency = ''`);
        const currencyIndex = await executeQuery(`SHOW INDEX FROM orders WHERE Key_name='idx_orders_currency'`);
        if (!currencyIndex.length) {
          console.log('[SCHEMA] Creating idx_orders_currency');
          await executeQuery(`CREATE INDEX idx_orders_currency ON orders(currency)`);
        }
      }

      // Check for payment_success_indicator column
      const checkCol = await executeQuery(`SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='orders' AND column_name='payment_success_indicator'`);
      if (!checkCol[0].cnt) {
        console.log('[SCHEMA] Adding orders.payment_success_indicator column');
        await executeQuery(`ALTER TABLE orders ADD COLUMN payment_success_indicator VARCHAR(64) NULL AFTER payment_session_id`);
      }
      
      // Check for payment_transaction_id column
      const checkTransactionCol = await executeQuery(`SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='orders' AND column_name='payment_transaction_id'`);
      if (!checkTransactionCol[0].cnt) {
        console.log('[SCHEMA] Adding orders.payment_transaction_id column');
        await executeQuery(`ALTER TABLE orders ADD COLUMN payment_transaction_id VARCHAR(128) NULL AFTER payment_success_indicator`);
      }
      // Check for index on payment_session_id
      const idxSession = await executeQuery(`SHOW INDEX FROM orders WHERE Key_name='idx_orders_payment_session'`);
      if (!idxSession.length) {
        console.log('[SCHEMA] Creating idx_orders_payment_session');
        await executeQuery(`CREATE INDEX idx_orders_payment_session ON orders(payment_session_id)`);
      }
      // Check for index on payment_success_indicator
      const idxSuccess = await executeQuery(`SHOW INDEX FROM orders WHERE Key_name='idx_orders_payment_success_indicator'`);
      if (!idxSuccess.length) {
        console.log('[SCHEMA] Creating idx_orders_payment_success_indicator');
        await executeQuery(`CREATE INDEX idx_orders_payment_success_indicator ON orders(payment_success_indicator)`);
      }
      checked = true;
      console.log('[SCHEMA] Payment schema verified');
      return true;
    } catch (err) {
      console.error('[SCHEMA] Payment schema ensure failed:', err.message);
      return false;
    } finally {
      inProgress = null;
    }
  })();
  return inProgress;
}

module.exports = { ensurePaymentSchema };
