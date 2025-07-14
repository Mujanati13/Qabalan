const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fecs_db',
  charset: 'utf8mb4',
  timezone: '+00:00',
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  waitForConnections: true,
  idleTimeout: 300000,
  maxIdle: 10
};


// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute query with error handling
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

// Execute multiple queries in transaction
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params = [] } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Get paginated results
const getPaginatedResults = async (query, params = [], page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Get total count - handle complex queries with JOINs and subqueries
    let countQuery;
    if (query.includes('LEFT JOIN') || query.includes('INNER JOIN') || query.includes('JOIN')) {
      // For complex queries with JOINs, wrap in a subquery
      const mainQuery = query.substring(0, query.indexOf('ORDER BY') > -1 ? query.indexOf('ORDER BY') : query.length);
      countQuery = `SELECT COUNT(*) as total FROM (${mainQuery}) as count_table`;
    } else {
      // Simple replace for basic queries
      countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
    }
    
    const countResult = await executeQuery(countQuery, params);
    const total = (countResult && countResult[0] && countResult[0].total) ? parseInt(countResult[0].total) : 0;
    
    // Get paginated data
    const paginatedQuery = `${query} LIMIT ${limit} OFFSET ${offset}`;
    const data = await executeQuery(paginatedQuery, params);
    
    return {
      data: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('Pagination error:', error);
    throw error;
  }
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  getPaginatedResults
};
