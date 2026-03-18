const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'prod_restaurant_user',
  password: process.env.PGPASSWORD || 'Developer@123',
  database: process.env.PGDATABASE || 'restaurant_saas',
  port: process.env.PGPORT || 5432,
});

/**
 * Transaction Helper
 * @param {Function} callback - Async function that receives a client to perform queries
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Database is initialized manually via schema.sql

module.exports = {
  query: (text, params) => pool.query(text, params),
  transaction,
};
