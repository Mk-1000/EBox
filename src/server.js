const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

require('dotenv').config();

// Import DDD components
const container = require('./infrastructure/config/Container');
const { errorHandler, notFoundHandler } = require('./infrastructure/middleware/ErrorMiddleware');

// Import routes
const authRoutes = require('./infrastructure/routes/AuthRoutes');
const projectRoutes = require('./infrastructure/routes/ProjectRoutes');
const taskRoutes = require('./infrastructure/routes/TaskRoutes');

const app = express();

// Trust proxy for secure cookies behind reverse proxies (e.g., Fly.io, Render, Nginx)
app.set('trust proxy', 1);

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(cookieSession({
  name: 'sid',
  keys: [process.env.SESSION_SECRET || 'dev_secret_change_me'],
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 30
}));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const databaseConnection = container.get('databaseConnection');
    const healthStatus = await databaseConnection.healthCheck();
    res.json(healthStatus);
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Static files with proper MIME types for ES6 modules
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Catch-all handler for SPA
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling middleware
app.use(errorHandler);
app.use(notFoundHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eisenhower Box app listening on http://localhost:${PORT}`);
  console.log('DDD Architecture initialized successfully');
});

module.exports = app;