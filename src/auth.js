const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./db');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (rows.length > 0) return res.status(409).json({ error: 'User already exists' });

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date();
    await pool.query(
      'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [id, username, passwordHash, now]
    );

    req.session.user = { id, username };
    res.json({ ok: true, user: { id, username } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.user = { id: user.id, username: user.username };
    res.json({ ok: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  // cookie-session does not support destroy(); clear by nulling the session
  req.session = null;
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.session.user });
});

module.exports = router;


