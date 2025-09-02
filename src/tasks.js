const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.json({ tasks: rows });
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const { title, description = '', quadrant } = req.body;
  if (!title || !quadrant) return res.status(400).json({ error: 'Title and quadrant required' });
  if (!['do_first','schedule','delegate','eliminate'].includes(quadrant)) return res.status(400).json({ error: 'Invalid quadrant' });
  const id = uuidv4();
  const now = new Date();
  try {
    await pool.query(
      'INSERT INTO tasks (id, user_id, title, description, quadrant, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
      [id, req.session.user.id, title, description, quadrant, now, now]
    );
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.status(201).json({ task: rows[0] });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description = '', quadrant } = req.body;
  if (!title || !quadrant) return res.status(400).json({ error: 'Title and quadrant required' });
  if (!['do_first','schedule','delegate','eliminate'].includes(quadrant)) return res.status(400).json({ error: 'Invalid quadrant' });
  const now = new Date();
  try {
    const [result] = await pool.query(
      'UPDATE tasks SET title = ?, description = ?, quadrant = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [title, description, quadrant, now, id, req.session.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/move', async (req, res) => {
  const { id } = req.params;
  const { quadrant } = req.body;
  if (!['do_first','schedule','delegate','eliminate'].includes(quadrant)) return res.status(400).json({ error: 'Invalid quadrant' });
  const now = new Date();
  try {
    const [result] = await pool.query('UPDATE tasks SET quadrant = ?, updated_at = ? WHERE id = ? AND user_id = ?', [quadrant, now, id, req.session.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('Move task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  const now = new Date();
  try {
    const [result] = await pool.query('UPDATE tasks SET completed = ?, updated_at = ? WHERE id = ? AND user_id = ?', [completed ? 1 : 0, now, id, req.session.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('Toggle task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


