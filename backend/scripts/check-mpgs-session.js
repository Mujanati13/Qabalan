require('dotenv').config();
const mpgs = require('../services/mpgsService');

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Usage: node scripts/check-mpgs-session.js <sessionId>');
  process.exit(1);
}

(async () => {
  try {
    const { data } = await mpgs.client.get(`${mpgs._sessionUrl()}/${sessionId}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to fetch MPGS session:', error.response?.data || error.message);
  }
})();
