const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../config/database');

async function executeSQLFile(filename) {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, filename);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Remove comments and split SQL statements properly
    const cleanedSQL = sqlContent
      .replace(/--.*$/gm, '') // Remove single line comments
      .replace(/\/\*[\s\S]*?\*\//gm, ''); // Remove multi-line comments
    
    // Split SQL statements by semicolon and filter out empty statements
    const statements = cleanedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Executing ${statements.length} SQL statements from ${filename}...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}: ${statement.substring(0, 100)}...`);
        await executeQuery(statement);
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log(`✅ All statements from ${filename} executed successfully!`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Get filename from command line argument
const filename = process.argv[2];
if (!filename) {
  console.error('Usage: node execute-sql.js <sql-filename>');
  process.exit(1);
}

executeSQLFile(filename);
