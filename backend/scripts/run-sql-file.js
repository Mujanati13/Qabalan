const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const splitStatements = (sql) => {
  return sql
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0 && !statement.startsWith('--'));
};

async function runSqlFile(fileArg) {
  if (!fileArg) {
    console.error('Usage: node scripts/run-sql-file.js <path-to-sql-file>');
    process.exit(1);
  }

  const resolvedPath = path.isAbsolute(fileArg)
    ? fileArg
    : path.join(__dirname, '..', fileArg);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`SQL file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(resolvedPath, 'utf8');
  const statements = splitStatements(sqlContent);

  if (!statements.length) {
    console.warn('No executable SQL statements found.');
    process.exit(0);
  }

  console.log(`Running ${statements.length} statements from ${resolvedPath}`);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await connection.query(statement);
        console.log(`  ✓ Statement ${i + 1}/${statements.length} executed`);
      } catch (error) {
        console.error(`  ✗ Statement ${i + 1} failed: ${error.message}`);
        throw error;
      }
    }

    await connection.commit();
    console.log('Migration completed successfully.');
  } catch (error) {
    await connection.rollback();
    console.error('Migration failed. Changes rolled back.');
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

runSqlFile(process.argv[2]).catch(error => {
  console.error('Unexpected error running SQL file:', error.message);
  process.exit(1);
});
