const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
  DB_SSL,
  DB_SSL_REJECT_UNAUTHORIZED,
} = process.env;

const useSSL = String(DB_SSL || '').toLowerCase() === 'true';
const rejectUnauthorized = String(DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true';

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT ? Number(DB_PORT) : 3306,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
  ssl: useSSL ? { rejectUnauthorized } : undefined,
});

async function runMigrations() {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      quadrant ENUM('do_first','schedule','delegate','eliminate') NOT NULL,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      CONSTRAINT fk_tasks_user FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    );
  `;

  const createIndexSQL = `
    CREATE INDEX idx_tasks_user_quadrant ON tasks(user_id, quadrant);
  `;

  const conn = await pool.getConnection();
  try {
    await conn.query(createTablesSQL);
    try {
      await conn.query(createIndexSQL);
    } catch (e) {
      // Ignore if index already exists
    }
  } finally {
    conn.release();
  }
}

runMigrations().catch((err) => {
  console.error('Database migration failed:', err);
  process.exit(1);
});

module.exports = {
  pool,
};


