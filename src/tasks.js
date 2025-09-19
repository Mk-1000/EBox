const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.use(requireAuth);

// Get tasks for a specific project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, priority, sortBy = 'priority' } = req.query;
    
    let query = `
      SELECT t.*, 
       COUNT(st.id) as subtask_count,
       COUNT(CASE WHEN st.completed = 1 THEN 1 END) as completed_subtasks
       FROM tasks t
       LEFT JOIN tasks st ON t.id = st.parent_task_id
       WHERE t.project_id = ? AND t.parent_task_id IS NULL
    `;
    
    const params = [projectId];
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    
    query += ' GROUP BY t.id';
    
    // Add sorting
    switch (sortBy) {
      case 'priority':
        query += ' ORDER BY CASE t.priority WHEN "High" THEN 1 WHEN "Medium" THEN 2 WHEN "Low" THEN 3 END, t.created_at ASC';
        break;
      case 'status':
        query += ' ORDER BY CASE t.status WHEN "To Do" THEN 1 WHEN "In Progress" THEN 2 WHEN "Done" THEN 3 END, t.created_at ASC';
        break;
      case 'due_date':
        query += ' ORDER BY t.due_date ASC, t.created_at ASC';
        break;
      default:
        query += ' ORDER BY t.created_at DESC';
    }
    
    const [rows] = await pool.query(query, params);
    
    // Get subtasks for each task
    const tasksWithSubtasks = await Promise.all(
      rows.map(async (task) => {
        const [subtaskRows] = await pool.query(
          'SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY created_at ASC',
          [task.id]
        );
        
        return {
          ...task,
          subtasks: subtaskRows
        };
      })
    );
    
    res.json({ tasks: tasksWithSubtasks });
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  const { 
    projectId, 
    title, 
    description = '', 
    priority = 'Medium', 
    status = 'To Do', 
    dueDate = null,
    parentTaskId = null 
  } = req.body;
  
  if (!projectId || !title) return res.status(400).json({ error: 'Project ID and title are required' });
  if (!['High','Medium','Low'].includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  if (!['To Do','In Progress','Done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  
  const id = uuidv4();
  const now = new Date();
  
  try {
    // Verify project belongs to user
    const [projectRows] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.session.user.id]
    );
    
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // If this is a subtask, verify parent task exists and belongs to same project
    if (parentTaskId) {
      const [parentRows] = await pool.query(
        'SELECT id FROM tasks WHERE id = ? AND project_id = ? AND user_id = ?',
        [parentTaskId, projectId, req.session.user.id]
      );
      
      if (parentRows.length === 0) {
        return res.status(404).json({ error: 'Parent task not found' });
      }
    }
    
    await pool.query(
      'INSERT INTO tasks (id, project_id, user_id, title, description, priority, status, due_date, parent_task_id, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
      [id, projectId, req.session.user.id, title, description, priority, status, dueDate, parentTaskId, now, now]
    );
    
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.status(201).json({ task: rows[0] });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    description = '', 
    priority = 'Medium', 
    status = 'To Do', 
    dueDate = null 
  } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!['High','Medium','Low'].includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  if (!['To Do','In Progress','Done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  
  const now = new Date();
  
  try {
    const [result] = await pool.query(
      'UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [title, description, priority, status, dueDate, now, id, req.session.user.id]
    );
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a task
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

// Toggle task completion
router.post('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  const now = new Date();
  
  try {
    const [result] = await pool.query(
      'UPDATE tasks SET completed = ?, updated_at = ? WHERE id = ? AND user_id = ?', 
      [completed ? 1 : 0, now, id, req.session.user.id]
    );
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('Toggle task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task status
router.post('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['To Do','In Progress','Done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  
  const now = new Date();
  
  try {
    const [result] = await pool.query(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [status, now, id, req.session.user.id]
    );
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.json({ task: rows[0] });
  } catch (err) {
    console.error('Update task status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


