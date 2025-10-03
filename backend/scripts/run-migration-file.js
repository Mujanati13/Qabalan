const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  const [, , migrationFile] = process.argv;

  if (!migrationFile) {
    console.error('❌ Please provide the migration file name to run (e.g. node scripts/run-migration-file.js 030_add_shipping_discount_to_orders.sql)');
    process.exit(1);
  }

  const migrationPath = path.isAbsolute(migrationFile)
    ? migrationFile
    : path.join(__dirname, '..', 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  const statements = sqlContent
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith('--'));

  if (statements.length === 0) {
    console.log('ℹ️ No SQL statements found in the migration file. Nothing to execute.');
    return;
  }

  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'simo1234',
      database: process.env.DB_NAME || 'fecs_db',
      multipleStatements: true
    });

    console.log(`✅ Connected to database ${process.env.DB_NAME || 'fecs_db'}`);
    console.log(`▶️ Running migration: ${path.basename(migrationPath)}`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`➡️ Executing statement ${i + 1} of ${statements.length}`);
      await connection.execute(statement);
      console.log(`✅ Statement ${i + 1} completed`);
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

main();
