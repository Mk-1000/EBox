const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.use(requireAuth);

// Get all projects for the user
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, 
       COUNT(t.id) as total_tasks,
       COUNT(CASE WHEN t.completed = 1 THEN 1 END) as completed_tasks
       FROM projects p
       LEFT JOIN tasks t ON p.id = t.project_id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [req.session.user.id]
    );
    
    // Calculate progress percentage
    const projects = rows.map(project => ({
      ...project,
      progress: project.total_tasks > 0 ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0
    }));
    
    res.json({ projects });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single project with its tasks
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get project details
    const [projectRows] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, req.session.user.id]
    );
    
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectRows[0];
    
    // Get tasks for this project
    const [taskRows] = await pool.query(
      `SELECT t.*, 
       COUNT(st.id) as subtask_count,
       COUNT(CASE WHEN st.completed = 1 THEN 1 END) as completed_subtasks
       FROM tasks t
       LEFT JOIN tasks st ON t.id = st.parent_task_id
       WHERE t.project_id = ? AND t.parent_task_id IS NULL
       GROUP BY t.id
       ORDER BY 
         CASE t.priority 
           WHEN 'High' THEN 1 
           WHEN 'Medium' THEN 2 
           WHEN 'Low' THEN 3 
         END,
         t.created_at ASC`,
      [id]
    );
    
    // Get subtasks for each task
    const tasksWithSubtasks = await Promise.all(
      taskRows.map(async (task) => {
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
    
    res.json({ 
      project: {
        ...project,
        tasks: tasksWithSubtasks
      }
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new project
router.post('/', async (req, res) => {
  const { title, description = '', quadrant = 'not-urgent-not-important' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  
  const id = uuidv4();
  const now = new Date();
  
  try {
    await pool.query(
      'INSERT INTO projects (id, user_id, title, description, quadrant, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.session.user.id, title, description, quadrant, now, now]
    );
    
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.status(201).json({ project: rows[0] });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a project
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description = '', quadrant } = req.body;
  
  const now = new Date();
  
  try {
    let query, params;
    
    // If only updating quadrant, don't require title
    if (quadrant !== undefined && title === undefined) {
      query = 'UPDATE projects SET quadrant = ?, updated_at = ? WHERE id = ? AND user_id = ?';
      params = [quadrant, now, id, req.session.user.id];
    } else if (title !== undefined) {
      // If updating title/description, require title
      if (!title) return res.status(400).json({ error: 'Title is required' });
      
      if (quadrant !== undefined) {
        query = 'UPDATE projects SET title = ?, description = ?, quadrant = ?, updated_at = ? WHERE id = ? AND user_id = ?';
        params = [title, description, quadrant, now, id, req.session.user.id];
      } else {
        query = 'UPDATE projects SET title = ?, description = ?, updated_at = ? WHERE id = ? AND user_id = ?';
        params = [title, description, now, id, req.session.user.id];
      }
    } else {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const [result] = await pool.query(query, params);
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Project not found' });
    
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    res.json({ project: rows[0] });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await pool.query('DELETE FROM projects WHERE id = ? AND user_id = ?', [id, req.session.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
