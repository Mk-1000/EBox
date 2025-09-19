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

// Validate required environment variables
if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_DATABASE) {
  console.error('Missing required database environment variables:');
  console.error('DB_HOST:', DB_HOST ? '✓' : '✗');
  console.error('DB_USER:', DB_USER ? '✓' : '✗');
  console.error('DB_PASSWORD:', DB_PASSWORD ? '✓' : '✗');
  console.error('DB_DATABASE:', DB_DATABASE ? '✓' : '✗');
}

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

    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      quadrant ENUM('urgent-important','not-urgent-important','urgent-not-important','not-urgent-not-important') DEFAULT 'not-urgent-not-important',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      CONSTRAINT fk_projects_user FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(36) PRIMARY KEY,
      project_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority ENUM('High','Medium','Low') NOT NULL DEFAULT 'Medium',
      status ENUM('To Do','In Progress','Done') NOT NULL DEFAULT 'To Do',
      due_date DATETIME NULL,
      parent_task_id VARCHAR(36) NULL,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_tasks_user FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE
    );
  `;

  const createIndexSQL = `
    CREATE INDEX idx_projects_user ON projects(user_id);
    CREATE INDEX idx_tasks_project ON tasks(project_id);
    CREATE INDEX idx_tasks_user ON tasks(user_id);
    CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
    CREATE INDEX idx_tasks_status ON tasks(status);
    CREATE INDEX idx_tasks_priority ON tasks(priority);
  `;

  const addQuadrantColumnSQL = `
    ALTER TABLE projects 
    ADD COLUMN quadrant ENUM('urgent-important','not-urgent-important','urgent-not-important','not-urgent-not-important') 
    DEFAULT 'not-urgent-not-important';
  `;

  const conn = await pool.getConnection();
  try {
    await conn.query(createTablesSQL);
    try {
      await conn.query(createIndexSQL);
    } catch (e) {
      // Ignore if index already exists
    }
    try {
      await conn.query(addQuadrantColumnSQL);
    } catch (e) {
      // Ignore if column already exists
      console.log('Quadrant column already exists or could not be added:', e.message);
    }
  } finally {
    conn.release();
  }
}

// Run migrations on startup, but don't crash the process if they fail
// This allows the app to start even if DB is temporarily unavailable
runMigrations().catch((err) => {
  console.error('Database migration failed:', err);
  console.log('App will continue to run, but database operations may fail');
});

module.exports = {
  pool,
};


