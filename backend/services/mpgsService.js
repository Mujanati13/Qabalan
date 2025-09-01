const axios = require('axios');

// MPGS configuration (test defaults provided, override via environment variables)
// Normalize gateway: remove trailing slashes
function normalizeGateway(raw){
  if(!raw) return 'https://mtf.gateway.mastercard.com';
  let g = raw.trim();
  // remove trailing slashes
  g = g.replace(/\/+$/, '');
  return g;
}

const MPGS_CONFIG = {
  gateway: normalizeGateway(process.env.MPGS_GATEWAY || process.env.MPGS_BASE_URL || 'https://mtf.gateway.mastercard.com'),
  apiVersion: process.env.MPGS_API_VERSION || '73',
  merchantId: process.env.MPGS_MERCHANT_ID || 'TESTNITEST2',
  apiUsername: process.env.MPGS_API_USERNAME || 'merchant.TESTNITEST2',
  apiPassword: process.env.MPGS_API_PASSWORD || 'CHANGE_ME',
  defaultCurrency: process.env.MPGS_DEFAULT_CURRENCY || 'JOD',
  merchantDisplayName: process.env.MPGS_MERCHANT_NAME || process.env.MPGS_MERCHANT_DISPLAY_NAME || 'Test Merchant'
};

class MPGSService {
  constructor(cfg) {
    this.cfg = cfg;
  // Normalize gateway: strip trailing slashes; ensure we include /api for REST endpoints
  let configuredGateway = cfg.gateway;
  configuredGateway = configuredGateway.replace(/\/+$/, '');
  // Remove a trailing /api so we can append consistently below
  configuredGateway = configuredGateway.replace(/\/api$/i, '');
  const base = configuredGateway + '/api';
    this.client = axios.create({
      baseURL: base,
      auth: { username: cfg.apiUsername, password: cfg.apiPassword },
      timeout: 10000
    });
  }

  _sessionUrl() { return `/rest/version/${this.cfg.apiVersion}/merchant/${this.cfg.merchantId}/session`; }
  _orderUrl(orderId){ return `/rest/version/${this.cfg.apiVersion}/merchant/${this.cfg.merchantId}/order/${orderId}`; }
  _transactionUrl(orderId){ return `${this._orderUrl(orderId)}/transaction`; }

  // Get order status for debugging
  async getOrderStatus(orderId) {
    try {
      console.log(`[MPGS] Getting order status for: ${orderId}`);
      const { data } = await this.client.get(this._orderUrl(orderId));
      console.log(`[MPGS] Order ${orderId} status:`, JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error(`[MPGS] Error getting order ${orderId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async createCheckoutSession({ orderId, amount, currency = this.cfg.defaultCurrency, returnUrl, cancelUrl }) {
    // MPGS will append its own query parameters (e.g. resultIndicator) to returnUrl.
    // Keep URLs clean (no template placeholders) and include orderId for reference.
    if (!returnUrl) throw new Error('returnUrl is required for MPGS checkout session');

    const cleanReturnUrl = `${returnUrl}?orderId=${encodeURIComponent(orderId)}`;
    const cleanCancelUrl = (cancelUrl || `${returnUrl}?orderId=${encodeURIComponent(orderId)}&status=cancelled`);

    // Strategy: For hosted payment pages, we need CREATE_CHECKOUT_SESSION without interaction details
    // The interaction details (returnUrl, etc.) are provided in the form submission, not the session
    const minimalPayload = {
      apiOperation: 'CREATE_CHECKOUT_SESSION',
      order: { 
        id: String(orderId),
        amount: Number(amount).toFixed(2),
        currency
      }
    };

    const enhancedPayload = {
      apiOperation: 'INITIATE_CHECKOUT',
      order: {
        id: String(orderId),
        amount: Number(amount).toFixed(2),
        currency
      },
      interaction: {
        operation: 'PURCHASE',
        returnUrl: cleanReturnUrl,
        cancelUrl: cleanCancelUrl
      },
      // Only added in second attempt if merchant profile supports it
      sourceOfFunds: { type: 'CARD' }
    };

    console.log('[MPGS] Attempt 1 CREATE_CHECKOUT_SESSION payload:', JSON.stringify(minimalPayload, null, 2));
    
    // Attempt chain with single outer catch for unified logging
    // 1. Minimal CREATE_CHECKOUT_SESSION
    const attempt1 = await this._postSession(minimalPayload, 'CREATE_CHECKOUT_SESSION(minimal)');
    if (attempt1.ok) return attempt1.data;
    const explanation1 = attempt1.explanation || '';
    const retryable1 = /unsupported|invalid|missing|not.*allowed|unexpected/i.test(explanation1);
    if (!retryable1) throw attempt1.error;

    // 1b. Retry CREATE_CHECKOUT_SESSION including amount/currency if gateway maybe requires them (opposite configuration)
    if (/order\.amount/i.test(explanation1)) {
      // If it explicitly complained about order.amount, skip adding them again.
    } else {
  const withAmountPayload = { ...minimalPayload, order: { id: String(orderId), amount: Number(amount).toFixed(2), currency } };
      const attempt1b = await this._postSession(withAmountPayload, 'CREATE_CHECKOUT_SESSION(withAmount)');
      if (attempt1b.ok) return attempt1b.data;
      const explanation1b = attempt1b.explanation || '';
      if (!/unsupported|invalid|missing|not.*allowed|unexpected/i.test(explanation1b)) throw attempt1b.error;
    }

    // 2. INITIATE_CHECKOUT with sourceOfFunds
    const attempt2 = await this._postSession(enhancedPayload, 'INITIATE_CHECKOUT');
    if (attempt2.ok) return attempt2.data;
    const explanation2 = attempt2.explanation;
    if (/sourceOfFunds\.type/i.test(explanation2)) {
      // 3. INITIATE_CHECKOUT without sourceOfFunds
      const thirdPayload = { ...enhancedPayload };
      delete thirdPayload.sourceOfFunds;
      const attempt3 = await this._postSession(thirdPayload, 'INITIATE_CHECKOUT(no sourceOfFunds)');
      if (attempt3.ok) return attempt3.data;
      throw attempt3.error;
    }
    throw attempt2.error;
  }

  async _postSession(payload, label){
    try {
      console.log(`[MPGS] Attempt ${label} payload:`, JSON.stringify(payload, null, 2));
      const { data } = await this.client.post(this._sessionUrl(), payload, {
        headers: { 'X-Debug-Amount-Format': payload.order?.amount }
      });
      console.log(`[MPGS] Session response (${label} success):`, JSON.stringify(data, null, 2));
      return { ok: true, data };
    } catch (err) {
      const explanation = err.response?.data?.error?.explanation || err.message;
      console.warn(`[MPGS] Attempt ${label} failed:`, explanation);
      return { ok: false, error: err, explanation };
    }
  }

  async retrieveOrder(orderId) {
    try {
  const { data } = await this.client.get(this._orderUrl(orderId));
  console.log(`[MPGS] Retrieved order ${orderId}:`, JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
  console.error(`[MPGS] Failed to retrieve order ${orderId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Ensure an order exists explicitly (some profiles require explicit PUT before hosted session use)
  async ensureOrder(orderId, amount, currency = this.cfg.defaultCurrency) {
    try {
      const url = this._orderUrl(orderId);
      const payload = { order: { amount: Number(amount).toFixed(2), currency } }; // implicit create/update
      console.log('[MPGS] Ensuring order via PUT:', url, payload);
      const { data } = await this.client.put(url, payload);
      console.log('[MPGS] ensureOrder response:', JSON.stringify(data, null, 2));
      return data;
    } catch (e) {
      console.warn('[MPGS] ensureOrder failed (continuing):', e.response?.data || e.message);
      throw e;
    }
  }

  // Explicit hosted checkout session creator (INITIATE_CHECKOUT, no sourceOfFunds) so interaction.returnUrl is persisted
  async createHostedSession({ orderId, amount, currency = this.cfg.defaultCurrency, returnUrl, cancelUrl }) {
    if (!returnUrl) throw new Error('returnUrl required');
    const payload = {
      apiOperation: 'INITIATE_CHECKOUT',
      order: { id: String(orderId), amount: Number(amount).toFixed(2), currency },
      interaction: { operation: 'PURCHASE', returnUrl, cancelUrl: cancelUrl || returnUrl }
    };
    const attempt = await this._postSession(payload, 'INITIATE_CHECKOUT(hosted)');
    if (!attempt.ok) throw attempt.error;
    return attempt.data;
  }

  // Hosted Checkout (Flow A) creator using CREATE_CHECKOUT_SESSION with interaction.merchant.name
  async createHostedCheckout({ orderId, amount, currency = this.cfg.defaultCurrency, returnUrl, cancelUrl }) {
    if (!returnUrl) throw new Error('returnUrl required');
    const payload = {
      apiOperation: 'CREATE_CHECKOUT_SESSION',
      order: { id: String(orderId), amount: Number(amount).toFixed(2), currency },
      interaction: {
        operation: 'PURCHASE',
        merchant: { name: this.cfg.merchantDisplayName },
        returnUrl, cancelUrl: cancelUrl || returnUrl
      }
    };
    // Attempt, fallback to INITIATE if CREATE rejects fields (some profiles vary)
    const first = await this._postSession(payload, 'CREATE_CHECKOUT_SESSION(hostedCheckout)');
    if (first.ok) return first.data;
    const expl = first.explanation || '';
    if (/unexpected|invalid|unsupported/i.test(expl)) {
      const altPayload = {
        apiOperation: 'INITIATE_CHECKOUT',
        order: { id: String(orderId), amount: Number(amount).toFixed(2), currency },
        interaction: { operation: 'PURCHASE', merchant: { name: this.cfg.merchantDisplayName }, returnUrl, cancelUrl: cancelUrl || returnUrl }
      };
      const second = await this._postSession(altPayload, 'INITIATE_CHECKOUT(hostedCheckout fallback)');
      if (second.ok) return second.data;
      throw second.error;
    }
    throw first.error;
  }

  async updateSession(sessionId, updateData) {
    const url = `${this._sessionUrl()}/${sessionId}`;
    const { data } = await this.client.put(url, updateData);
    return data;
  }

  async authorize(orderId, txnId, amount, currency = this.cfg.defaultCurrency) {
    return this._transaction(orderId, txnId, amount, currency, 'AUTHORIZE');
  }
  async capture(orderId, txnId, amount, currency = this.cfg.defaultCurrency) {
    return this._transaction(orderId, txnId, amount, currency, 'CAPTURE');
  }
  async refund(orderId, txnId, amount, currency = this.cfg.defaultCurrency) {
    return this._transaction(orderId, txnId, amount, currency, 'REFUND');
  }

  async _transaction(orderId, txnId, amount, currency, apiOperation){
    const payload = { apiOperation, transaction: { reference: txnId }, order: { amount, currency }};
    const { data } = await this.client.post(this._transactionUrl(orderId), payload);
    return data;
  }

  // 3DS Authentication Methods
  async initiateAuthentication(authRequest) {
    try {
      console.log('[MPGS] Initiating 3DS authentication:', JSON.stringify(authRequest, null, 2));
      const { data } = await this.client.post(this._transactionUrl(authRequest.order.id), authRequest);
      console.log('[MPGS] Authentication initiation response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('[MPGS] Authentication initiation failed:', error.response?.data || error.message);
      throw new Error(`Authentication initiation failed: ${error.response?.data?.error?.explanation || error.message}`);
    }
  }

  async authenticatePayer(authRequest) {
    try {
      console.log('[MPGS] Authenticating payer:', JSON.stringify(authRequest, null, 2));
      const { data } = await this.client.post(this._transactionUrl(authRequest.order.id), authRequest);
      console.log('[MPGS] Payer authentication response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('[MPGS] Payer authentication failed:', error.response?.data || error.message);
      throw new Error(`Payer authentication failed: ${error.response?.data?.error?.explanation || error.message}`);
    }
  }

  async processPayment(orderId, sessionId) {
    try {
      const paymentPayload = {
        apiOperation: 'PAY',
        order: {
          id: orderId
        },
        session: {
          id: sessionId
        },
        transaction: {
          reference: `TXN_${orderId}_${Date.now()}`
        }
      };

      console.log('[MPGS] Processing payment:', JSON.stringify(paymentPayload, null, 2));
      const { data } = await this.client.post(this._transactionUrl(orderId), paymentPayload);
      console.log('[MPGS] Payment response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('[MPGS] Payment processing failed:', error.response?.data || error.message);
      throw new Error(`Payment processing failed: ${error.response?.data?.error?.explanation || error.message}`);
    }
  }
}

module.exports = new MPGSService(MPGS_CONFIG);
