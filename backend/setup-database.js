require('dotenv').config();
const DatabaseSetup = require('./utils/database-setup');

async function runSetup() {
  const setup = new DatabaseSetup();
  await setup.setup();
}

runSetup().catch(console.error);
