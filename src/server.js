const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

require('dotenv').config();
require('./db');

const authRoutes = require('./auth');
const taskRoutes = require('./tasks');

const app = express();

// Trust proxy for secure cookies behind reverse proxies (e.g., Fly.io, Render, Nginx)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieSession({
  name: 'sid',
  keys: [process.env.SESSION_SECRET || 'dev_secret_change_me'],
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 30
}));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eisenhower Box app listening on http://localhost:${PORT}`);
});


